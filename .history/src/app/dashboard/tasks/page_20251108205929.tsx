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
        console.debug(
          "tasks load failed",
          err instanceof Error ? err.message : String(err),
        );
        setError("Cannot load tasks. You may be offline.");
      } finally {
        if (mounted && mountedRef.current) setLoading(false);
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
      if (task.status === "pending") pending.push(task);
      else if (task.status === "in_progress") inProgress.push(task);
      else completed.push(task);
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
          }, 1000); // Simulate API delay
          return;
        }

        const res = await fetch("/api/tasks/summary", {
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

        const data = await res.json();

        // Only update if component is still mounted
        if (mountedRef.current) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === taskId ? { ...t, aiSummary: data.summary } : t,
            ),
          );
        }
      } catch (err: unknown) {
        console.error(
          "AI summary generation failed:",
          err instanceof Error ? err.message : String(err),
        );
        // Show user-friendly error message
        if (mountedRef.current) {
          setError("Failed to generate AI summary. Please check your connection and try again.");
          // Clear error after 5 seconds
          setTimeout(() => setError(null), 5000);
        }
      } finally {
        // Only update if component is still mounted
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
        <div className="github-page-header">
          <div>
            <h1 className="github-page-title">Task Management</h1>
            <p className="github-page-description">Organize and track your tasks with AI-powered insights</p>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={() => setViewMode("list")}
            >
              List View
            </button>
            <button
              className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
              onClick={() => setViewMode("board")}
            >
              Board View
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  To Do
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {columns.find((col) => col.id === "pending")?.tasks
                    .length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-lg">
                  📝
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  In Progress
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {columns.find((col) => col.id === "in_progress")?.tasks
                    .length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 dark:text-amber-400 text-lg">
                  ⚡
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Completed
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {columns.find((col) => col.id === "completed")?.tasks
                    .length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                  ✅
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Task Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <form className="flex gap-4">
            <div className="flex-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a new task..."
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200"
                aria-label="Task title"
              />
            </div>
            <button
              className="px-6 py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
              onClick={addTask}
              type="button"
            >
              <span className="text-lg">+</span>
              Add Task
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-8">
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
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-4 shadow-lg rotate-2">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {activeTask.title}
                      </div>
                      {activeTask.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
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
                    <div className="flex-1">
                      {editingTaskId === task._id ? (
                        <div className="space-y-3">
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                            placeholder="Task title..."
                          />
                          <textarea
                            value={editingDescription}
                            onChange={(e) =>
                              setEditingDescription(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 resize-none"
                            placeholder="Task description (optional)..."
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                              onClick={saveEditTask}
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-all duration-200"
                              onClick={cancelEditTask}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3
                            className={`font-semibold text-lg mb-2 ${
                              task.status === "completed"
                                ? "line-through text-slate-500 dark:text-slate-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </>
                      )}
                      {task.dueAt && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-slate-500 dark:text-slate-400 text-sm">
                            📅
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
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

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          task.status === "pending"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                            : task.status === "in_progress"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                        }`}
                      >
                        {task.status === "pending" && "To Do"}
                        {task.status === "in_progress" && "In Progress"}
                        {task.status === "completed" && "Done"}
                      </span>

                      <button
                        className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                        onClick={() => startEditTask(task)}
                        title="Edit task"
                      >
                        <svg
                          className="w-4 h-4"
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
                        className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        onClick={() => deleteTask(task._id)}
                        title="Delete task"
                      >
                        <svg
                          className="w-4 h-4"
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
                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      {generatingSummary === task._id ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                          <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                            Generating AI summary...
                          </span>
                        </div>
                      ) : task.aiSummary ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              🤖
                            </span>
                            <span className="text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                              AI Summary
                            </span>
                          </div>
                          <p className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
                            {task.aiSummary}
                          </p>
                        </div>
                      ) : (
                        <button
                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline text-sm font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(
                              new CustomEvent("generate-summary", {
                                detail: task._id,
                              }),
                            );
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
      className={`flex-shrink-0 w-80 transition-all duration-200 ${
        isOver ? "ring-2 ring-blue-500 ring-opacity-50" : ""
      }`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-96 flex flex-col overflow-hidden">
        {/* Column Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  column.id === "pending"
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    : column.id === "in_progress"
                      ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <span className="text-sm">
                  {column.id === "pending" && "📝"}
                  {column.id === "in_progress" && "⚡"}
                  {column.id === "completed" && "✅"}
                </span>
              </div>
              {column.title}
            </h3>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                column.id === "pending"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                  : column.id === "in_progress"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              }`}
            >
              {column.tasks.length}
            </span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-4 flex-1">
          <SortableContext
            items={column.tasks.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
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
                <div className="text-center py-12">
                  <div className="text-slate-400 dark:text-slate-500">
                    <svg
                      className="w-8 h-8 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Drop tasks here</p>
                  </div>
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 rotate-2 shadow-lg" : ""
      } ${task.status === "completed" ? "opacity-75" : ""}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4
            className={`font-medium text-slate-900 dark:text-white mb-2 ${
              task.status === "completed"
                ? "line-through text-slate-500 dark:text-slate-400"
                : ""
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              {task.description}
            </p>
          )}
          {task.dueAt && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                📅
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {new Date(task.dueAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <button
            className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Edit task"
          >
            <svg
              className="w-3 h-3"
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
            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task._id);
            }}
            title="Delete task"
          >
            <svg
              className="w-3 h-3"
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
      <div className="flex items-center justify-between">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
            task.status === "pending"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
              : task.status === "in_progress"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          }`}
        >
          {task.status === "pending" && "To Do"}
          {task.status === "in_progress" && "In Progress"}
          {task.status === "completed" && "Done"}
        </span>
      </div>

      <AnimatePresence>
        {task.status === "completed" && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            {generatingSummary === task._id ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent"></div>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  Generating AI summary...
                </span>
              </div>
            ) : task.aiSummary ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                    🤖
                  </span>
                  <span className="text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                    AI Summary
                  </span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  {task.aiSummary}
                </p>
              </div>
            ) : (
              <button
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline text-xs font-medium"
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
