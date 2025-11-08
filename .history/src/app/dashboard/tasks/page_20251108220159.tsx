"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  completed?: boolean; // For backwards compatibility with old tasks
  aiSummary?: string;
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Column = {
  id: "pending" | "in_progress" | "completed";
  title: string;
  tasks: Task[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(
    null,
  );

  // Refs for memory leak prevention
  const ongoingOperations = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set loading to false immediately to test
    setTimeout(() => {
      if (mounted && mountedRef.current) {
        setLoading(false);
      }
    }, 100);

    (async () => {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load tasks");
        const data = await res.json();
        if (!mounted || !mountedRef.current) return;

        const tasksWithStatus = data.tasks.map((task: any) => ({
          ...task,
          status: task.status || (task.completed ? "completed" : "pending"),
        }));

        setTasks(tasksWithStatus);
      } catch (err: unknown) {
        if (!mounted || !mountedRef.current) return;
        console.error("Failed to load tasks:", err);
        setError("Cannot load tasks. You may be offline.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(() => {
    const pending: Task[] = [];
    const inProgress: Task[] = [];
    const completed: Task[] = [];

    tasks.forEach((task) => {
      // Ensure status is normalized
      const taskStatus = task.status || (task.completed ? "completed" : "pending");

      if (taskStatus === "pending") {
        pending.push({ ...task, status: "pending" });
      } else if (taskStatus === "in_progress") {
        inProgress.push({ ...task, status: "in_progress" });
      } else if (taskStatus === "completed" || task.completed) {
        completed.push({ ...task, status: "completed" });
      } else {
        // Default to pending if status is undefined
        pending.push({ ...task, status: "pending" });
      }
    });

    return [
      { id: "pending" as const, title: "To Do", tasks: pending },
      { id: "in_progress" as const, title: "In Progress", tasks: inProgress },
      { id: "completed" as const, title: "Done", tasks: completed },
    ];
  }, [tasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const taskTitle = title.trim();
    const taskDescription = description.trim();
    if (!taskTitle) return;

    // Track this operation
    const operationId = `add-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Clear form
    setTitle("");
    setDescription("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      _id: tempId,
      title: taskTitle,
      description: taskDescription || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription || undefined,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();

      // Only update if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks((prev) =>
          prev.map((t) => (t._id === tempId ? data.task : t)),
        );
      }
    } catch (err: unknown) {
      console.debug(
        "create task failed",
        err instanceof Error ? err.message : String(err),
      );

      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks((prev) => prev.filter((t) => t._id !== tempId));
        setError("Unable to create task (maybe offline).");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: Task["status"]) => {
      // Skip API calls for static tasks
      if (taskId.startsWith("static-")) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? { ...t, status: newStatus } : t,
          ),
        );
        return;
      }

      // Track this operation
      const operationId = `status-${taskId}-${Date.now()}`;
      ongoingOperations.current.add(operationId);

      // Store current state for potential rollback
      const currentTasks = [...tasks];

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId ? { ...t, status: newStatus } : t,
        ),
      );

      try {
        const completed = newStatus === "completed";
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to update");
        const data = await res.json();

        // Only update if component is still mounted and operation is still ongoing
        if (mountedRef.current && ongoingOperations.current.has(operationId)) {
          // Ensure state matches server
          setTasks((prev) =>
            prev.map((t) =>
              t._id === taskId ? { ...data.task, status: newStatus } : t,
            ),
          );

          // Generate AI summary for completed tasks
          if (newStatus === "completed") {
            generateAISummary(taskId);
          }
        }
      } catch (err: unknown) {
        console.debug(
          "update task failed",
          err instanceof Error ? err.message : String(err),
        );

        // Only rollback if component is still mounted and operation is still ongoing
        if (mountedRef.current && ongoingOperations.current.has(operationId)) {
          setTasks(currentTasks); // rollback
          setError("Failed to update task");
        }
      } finally {
        ongoingOperations.current.delete(operationId);
      }
    },
    [tasks],
  );

  const generateAISummary = useCallback(
    async (taskId: string) => {
      // Prevent multiple simultaneous summary generations for the same task
      if (generatingSummary === taskId) return;

      setGeneratingSummary(taskId);

      try {
        const task = tasks.find((t) => t._id === taskId);
        if (!task) return;

        // For static tasks, generate a simple mock summary
        if (taskId.startsWith("static-")) {
          setTimeout(() => {
            if (mountedRef.current) {
              setTasks((prev) =>
                prev.map((t) =>
                  t._id === taskId
                    ? {
                      ...t,
                      aiSummary: `Task "${t.title}" has been completed successfully.`,
                    }
                    : t,
                ),
              );
              setGeneratingSummary(null);
            }
          }, 1000);
          return;
        }

        // Initialize empty summary for streaming
        if (mountedRef.current) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === taskId ? { ...t, aiSummary: "" } : t,
            ),
          );
        }

        const res = await fetch("/api/tasks/summary-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            title: task.title,
            description: task.description || "",
          }),
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("AI summary API error:", res.status, errorData);
          throw new Error(`Failed to generate summary: ${res.status}`);
        }

        // Check if response is streaming
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
          // Handle streaming response
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let accumulatedSummary = "";

          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    accumulatedSummary += parsed.content;

                    // Update task with streaming content in real-time
                    if (mountedRef.current) {
                      setTasks((prev) =>
                        prev.map((t) =>
                          t._id === taskId ? { ...t, aiSummary: accumulatedSummary } : t,
                        ),
                      );
                    }
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        } else {
          // Fallback to non-streaming response
          const data = await res.json();
          if (mountedRef.current) {
            setTasks((prev) =>
              prev.map((t) =>
                t._id === taskId ? { ...t, aiSummary: data.summary } : t,
              ),
            );
          }
        }
      } catch (err: unknown) {
        console.error(
          "AI summary generation failed:",
          err instanceof Error ? err.message : String(err),
        );
        if (mountedRef.current) {
          setError("Failed to generate AI summary. Please check your connection and try again.");
          setTimeout(() => setError(null), 5000);
        }
      } finally {
        if (mountedRef.current && !taskId.startsWith("static-")) {
          setGeneratingSummary(null);
        }
      }
    },
    [tasks, generatingSummary],
  );

  // Ref to store the latest generateAISummary function to avoid useEffect dependency issues
  const generateAISummaryRef = useRef(generateAISummary);

  // Update the ref whenever generateAISummary changes
  useEffect(() => {
    generateAISummaryRef.current = generateAISummary;
  }, [generateAISummary]);

  // Listen for AI summary generation requests
  useEffect(() => {
    const handleGenerateSummary = (e: CustomEvent<string>) => {
      generateAISummaryRef.current(e.detail);
    };
    window.addEventListener(
      "generate-summary",
      handleGenerateSummary as EventListener,
    );
    return () =>
      window.removeEventListener(
        "generate-summary",
        handleGenerateSummary as EventListener,
      );
  }, []); // Empty dependency array since we use ref

  async function deleteTask(id: string) {
    // Skip API calls for static tasks
    if (id.startsWith("static-")) {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return;
    }

    // Track this operation
    const operationId = `delete-${id}-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Store current state for potential rollback
    const currentTasks = [...tasks];

    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t._id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed");

      // Operation successful, no need to update state as optimistic update was correct
    } catch (err: unknown) {
      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        // Rollback on failure
        setTasks(currentTasks);
        console.debug(
          "delete task failed",
          err instanceof Error ? err.message : String(err),
        );
        setError("Failed to delete task");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task._id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
  }

  function cancelEditTask() {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  async function saveEditTask() {
    if (!editingTaskId) return;

    const task = tasks.find((t) => t._id === editingTaskId);
    if (!task) return;

    // Skip API calls for static tasks
    if (editingTaskId.startsWith("static-")) {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === editingTaskId
            ? { ...t, title: editingTitle, description: editingDescription }
            : t,
        ),
      );
      cancelEditTask();
      return;
    }

    // Track this operation
    const operationId = `edit-${editingTaskId}-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Store current state for potential rollback
    const currentTasks = [...tasks];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === editingTaskId
          ? { ...t, title: editingTitle, description: editingDescription }
          : t,
      ),
    );

    try {
      const res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTitle,
          description: editingDescription,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update task");

      const data = await res.json();

      // Only update if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === editingTaskId
              ? { ...data.task, status: data.task.status || t.status }
              : t,
          ),
        );
        cancelEditTask();
      }
    } catch (err: unknown) {
      console.debug(
        "update task failed",
        err instanceof Error ? err.message : String(err),
      );

      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks(currentTasks); // rollback
        setError("Failed to update task");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer !== overContainer) {
      console.log(
        `Drag over: moving task ${activeId} from ${activeContainer} to ${overContainer}`,
      );
      setTasks((items) => {
        return items.map((t) => {
          if (t._id === activeId) {
            return { ...t, status: overContainer as Task["status"] };
          }
          return t;
        });
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    // Only update if containers are different
    if (activeContainer !== overContainer) {
      console.log(
        `Moving task ${activeId} from ${activeContainer} to ${overContainer}`,
      );
      updateTaskStatus(activeId, overContainer as Task["status"]);
    }
  }

  function findContainer(id: string) {
    if (id === "pending" || id === "in_progress" || id === "completed") {
      return id;
    }
    return tasks.find((t) => t._id === id)?.status;
  }

  // Prevent hydration mismatch by showing loading state until client is ready
  if (loading) {
    return (
      <div className="github-loading">
        <div className="github-spinner" />
        <p>Loading your tasks...</p>
      </div>
    );
  }

  if (viewMode === "board") {
    return (
      <div className="github-container">
        <div className="github-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 className="github-page-title">Task Management</h1>
            <p className="github-page-description">Organize and track your tasks with AI-powered insights</p>
          </div>

          {/* View Toggle Buttons */}
          <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setViewMode("list")}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              List View
            </button>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px',
                border: 'none',
                background: 'linear-gradient(180deg, #1f6feb, #1a5fc9)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setViewMode("board")}
            >
              Board View
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="github-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                  To Do
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                  {columns.find((col) => col.id === "pending")?.tasks
                    .length || 0}
                </p>
              </div>
              <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px' }}>
                  📝
                </span>
              </div>
            </div>
          </div>

          <div className="github-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                  In Progress
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                  {columns.find((col) => col.id === "in_progress")?.tasks
                    .length || 0}
                </p>
              </div>
              <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px' }}>
                  ⚡
                </span>
              </div>
            </div>
          </div>

          <div className="github-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                  Completed
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                  {columns.find((col) => col.id === "completed")?.tasks
                    .length || 0}
                </p>
              </div>
              <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px' }}>
                  ✅
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Task Form */}
        <div className="github-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <form style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a new task..."
              style={{
                flex: '1',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--fg)',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              aria-label="Task title"
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(31, 111, 235, 0.5)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={addTask}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px 0 rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px 0 rgba(102, 126, 234, 0.4)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
              Add Task
            </button>
          </form>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <p style={{ color: '#ef4444', margin: '0', fontSize: '14px' }}>{error}</p>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="kanban-columns"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              paddingBottom: '32px',
              width: '100%'
            }}
          >
            {columns.map((column) => {
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  onDelete={deleteTask}
                  onEdit={startEditTask}
                  generatingSummary={generatingSummary}
                />
              );
            })}
          </div>

          {typeof window !== "undefined"
            ? createPortal(
              <DragOverlay>
                {activeTask ? (
                  <div className="github-card" style={{ padding: '16px', boxShadow: '0 8px 24px rgba(2,6,23,0.4)', transform: 'rotate(2deg)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--fg)', marginBottom: '8px' }}>
                      {activeTask.title}
                    </div>
                    {activeTask.description && (
                      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0' }}>
                        {activeTask.description}
                      </p>
                    )}
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
            : null}
        </DndContext>
      </div>
    );
  }  // List View (modern design)
  return (
    <div className="github-container">
      <div className="github-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 className="github-page-title">Task Management</h1>
          <p className="github-page-description">Organize and track your tasks with AI-powered insights</p>
        </div>

        {/* View Toggle Buttons */}
        <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              border: 'none',
              background: 'linear-gradient(180deg, #1f6feb, #1a5fc9)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setViewMode("list")}
          >
            List View
          </button>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setViewMode("board")}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Board View
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="github-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                To Do
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                {columns.find((col) => col.id === "pending")?.tasks
                  .length || 0}
              </p>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>
                📝
              </span>
            </div>
          </div>
        </div>

        <div className="github-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                In Progress
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                {columns.find((col) => col.id === "in_progress")?.tasks
                  .length || 0}
              </p>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>
                ⚡
              </span>
            </div>
          </div>
        </div>

        <div className="github-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)', margin: '0 0 8px 0' }}>
                Completed
              </p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg)', margin: '0' }}>
                {columns.find((col) => col.id === "completed")?.tasks
                  .length || 0}
              </p>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>
                ✅
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <div className="github-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <form style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task..."
            style={{
              flex: '1',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--fg)',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            aria-label="Task title"
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(31, 111, 235, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <button
            className="btn-primary"
            onClick={addTask}
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', whiteSpace: 'nowrap' }}
          >
            <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
            Add Task
          </button>
        </form>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{ color: '#ef4444', margin: '0', fontSize: '14px' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.length === 0 ? (
          <div className="github-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px', opacity: '0.4' }}>📭</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--fg)', margin: '0 0 12px 0' }}>
              No tasks yet
            </h3>
            <p style={{ fontSize: '16px', color: 'var(--muted)', margin: '0' }}>
              Create your first task to get started
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className="github-card"
              style={{ padding: '20px', transition: 'all 0.15s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(88, 166, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--panel)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flexShrink: '0', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={(e) =>
                      updateTaskStatus(
                        task._id,
                        e.target.checked ? "completed" : "pending",
                      )
                    }
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--accent)'
                    }}
                  />
                </div>

                <div style={{ flex: '1', minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: '1' }}>
                      {editingTaskId === task._id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            placeholder="Task title..."
                          />
                          <textarea
                            value={editingDescription}
                            onChange={(e) =>
                              setEditingDescription(e.target.value)
                            }
                            placeholder="Task description (optional)..."
                            rows={2}
                            style={{ resize: 'none' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-primary"
                              onClick={saveEditTask}
                              type="button"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                            >
                              Save
                            </button>
                            <button
                              className="btn-ghost"
                              onClick={cancelEditTask}
                              type="button"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            {task.status === "in_progress" && (
                              <span style={{
                                fontSize: '18px',
                                animation: 'spin 2s linear infinite',
                                display: 'inline-block'
                              }}>
                                🔄
                              </span>
                            )}
                            {task.status === "completed" && (
                              <span style={{
                                fontSize: '18px',
                                color: '#10b981',
                                fontWeight: 'bold'
                              }}>
                                ✅
                              </span>
                            )}
                            <h3
                              style={{
                                fontWeight: '600',
                                fontSize: '16px',
                                margin: '0',
                                color: task.status === "completed" ? '#10b981' : task.status === "in_progress" ? '#f59e0b' : 'var(--fg)'
                              }}
                            >
                              {task.title}
                            </h3>
                          </div>
                          {task.description && (
                            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                              {task.description}
                            </p>
                          )}
                        </>
                      )}
                      {task.dueAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '14px' }}>
                            📅
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            Due{" "}
                            {new Date(task.dueAt).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Status Badge */}
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: task.status === "pending"
                            ? 'rgba(59, 130, 246, 0.1)'
                            : task.status === "in_progress"
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(16, 185, 129, 0.1)',
                          color: task.status === "pending"
                            ? '#3b82f6'
                            : task.status === "in_progress"
                              ? '#f59e0b'
                              : '#10b981'
                        }}
                      >
                        {task.status === "pending" && "To Do"}
                        {task.status === "in_progress" && "In Progress"}
                        {task.status === "completed" && "Done"}
                      </span>

                      <button
                        onClick={() => startEditTask(task)}
                        title="Edit task"
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                          e.currentTarget.style.color = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={() => deleteTask(task._id)}
                        title="Delete task"
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* AI Summary for completed tasks */}
                  {task.status === "completed" && (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '6px'
                    }}>
                      {generatingSummary === task._id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="github-spinner-sm"></div>
                          <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
                            Generating AI summary...
                          </span>
                        </div>
                      ) : task.aiSummary ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px' }}>
                              🤖
                            </span>
                            <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                              AI Summary
                            </span>
                          </div>
                          <p style={{ color: '#059669', fontSize: '13px', lineHeight: '1.6', margin: '0' }}>
                            {task.aiSummary}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(
                              new CustomEvent("generate-summary", {
                                detail: task._id,
                              }),
                            );
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '500',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: '0'
                          }}
                        >
                          ✨ Generate AI Summary
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  onDelete,
  onEdit,
  generatingSummary,
}: {
  column: Column;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  generatingSummary: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: '100%',
        transition: 'all 0.2s ease',
        ...(isOver ? { outline: '2px solid rgba(88, 166, 255, 0.5)', borderRadius: '8px' } : {})
      }}
    >
      <div className="github-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        {/* Column Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: '600', fontSize: '16px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '12px', margin: '0' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: column.id === "pending"
                    ? 'rgba(59, 130, 246, 0.1)'
                    : column.id === "in_progress"
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(16, 185, 129, 0.1)'
                }}
              >
                <span style={{ fontSize: '16px' }}>
                  {column.id === "pending" && "📝"}
                  {column.id === "in_progress" && "⚡"}
                  {column.id === "completed" && "✅"}
                </span>
              </div>
              {column.title}
            </h3>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                background: column.id === "pending"
                  ? 'rgba(59, 130, 246, 0.1)'
                  : column.id === "in_progress"
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(16, 185, 129, 0.1)',
                color: column.id === "pending"
                  ? '#3b82f6'
                  : column.id === "in_progress"
                    ? '#f59e0b'
                    : '#10b981'
              }}
            >
              {column.tasks.length}
            </span>
          </div>
        </div>

        {/* Tasks List */}
        <div style={{ padding: '16px', flex: '1' }}>
          <SortableContext
            items={column.tasks.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {column.tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  generatingSummary={generatingSummary}
                />
              ))}
              {column.tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '48px', marginBottom: '16px', opacity: '0.4' }}>
                    📋
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 4px 0' }}>No tasks yet</p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0', opacity: '0.7' }}>Drop tasks here</p>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onDelete,
  onEdit,
  generatingSummary,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  generatingSummary: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (task.status === "completed" ? 0.75 : 1),
    cursor: isDragging ? 'grabbing' : 'grab',
    ...(isDragging ? { boxShadow: '0 8px 24px rgba(2,6,23,0.4)', transform: 'rotate(2deg)' } : {})
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="github-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: '1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {task.status === "in_progress" && (
              <span style={{
                fontSize: '16px',
                animation: 'spin 2s linear infinite',
                display: 'inline-block'
              }}>
                🔄
              </span>
            )}
            {task.status === "completed" && (
              <span style={{
                fontSize: '16px',
                color: '#10b981',
                fontWeight: 'bold'
              }}>
                ✅
              </span>
            )}
            <h4
              style={{
                fontWeight: '500',
                fontSize: '14px',
                color: task.status === "completed" ? '#10b981' : task.status === "in_progress" ? '#f59e0b' : 'var(--fg)',
                margin: '0'
              }}
            >
              {task.title}
            </h4>
          </div>
          {task.description && (
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '12px' }}>
              {task.description}
            </p>
          )}
          {task.dueAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>
                📅
              </span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {new Date(task.dueAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          <button
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Edit task"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task._id);
            }}
            title="Delete task"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            background: task.status === "pending"
              ? 'rgba(59, 130, 246, 0.1)'
              : task.status === "in_progress"
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(16, 185, 129, 0.1)',
            color: task.status === "pending"
              ? '#3b82f6'
              : task.status === "in_progress"
                ? '#f59e0b'
                : '#10b981'
          }}
        >
          {task.status === "pending" && "To Do"}
          {task.status === "in_progress" && "In Progress"}
          {task.status === "completed" && "Done"}
        </span>
      </div>

      <AnimatePresence>
        {task.status === "completed" && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '6px'
          }}>
            {generatingSummary === task._id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="github-spinner-sm"></div>
                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                  Generating AI summary...
                </span>
              </div>
            ) : task.aiSummary ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>
                    🤖
                  </span>
                  <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                    AI Summary
                  </span>
                </div>
                <p style={{ color: '#059669', fontSize: '12px', lineHeight: '1.5', margin: '0' }}>
                  {task.aiSummary}
                </p>
              </div>
            ) : (
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: '500',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '0'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(
                    new CustomEvent("generate-summary", { detail: task._id }),
                  );
                }}
              >
                ✨ Generate AI Summary
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
