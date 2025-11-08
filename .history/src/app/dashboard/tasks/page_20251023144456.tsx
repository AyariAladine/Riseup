"use client";
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type Task = {
  _id: string;
  title: string;
  completed?: boolean;
  status?: 'pending' | 'in_progress' | 'completed';
  dueAt?: string | null;
  description?: string;
  aiSummary?: string;
};

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    let isCancelled = true;
    (async () => {
      try {
        const res = await fetch('/api/tasks', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json();
        if (!isCancelled) return;
        // Convert completed to status for backwards compatibility
        let convertedTasks = (data.tasks || []).map((task: Task) => ({
          ...task,
          status: task.status || (task.completed ? 'completed' : 'pending'),
        }));

        // Add more comprehensive static tasks for testing
        if (convertedTasks.length === 0) {
          convertedTasks = [
            {
              _id: 'static-1',
              title: 'Review project proposal and provide feedback',
              status: 'pending' as const,
              description: 'Analyze the new project proposal from the marketing team and provide detailed feedback with recommendations',
              dueAt: '2025-10-25'
            },
            {
              _id: 'static-2',
              title: 'Update API documentation with examples',
              status: 'in_progress' as const,
              description: 'Document all REST API endpoints with comprehensive examples, error codes, and usage scenarios',
              dueAt: '2025-10-24'
            },
            {
              _id: 'static-3',
              title: 'Fix OAuth authentication bug on mobile',
              status: 'completed' as const,
              description: 'Resolve the OAuth login flow issue affecting mobile devices and tablets',
              aiSummary: 'Successfully fixed the OAuth authentication bug by updating the token refresh logic and adding proper error handling for mobile devices. The issue was caused by race conditions in the token validation process.',
              dueAt: '2025-10-22'
            },
            {
              _id: 'static-4',
              title: 'Design new dashboard layout with Figma',
              status: 'pending' as const,
              description: 'Create wireframes and high-fidelity mockups for the improved dashboard interface using modern design principles',
              dueAt: '2025-10-28'
            },
            {
              _id: 'static-5',
              title: 'Implement comprehensive unit test suite',
              status: 'in_progress' as const,
              description: 'Write unit tests for all service classes, components, and utilities to achieve 90%+ code coverage',
              dueAt: '2025-10-26'
            },
            {
              _id: 'static-6',
              title: 'Deploy application to production environment',
              status: 'completed' as const,
              description: 'Deploy the latest version to production with zero-downtime deployment strategy and proper monitoring',
              aiSummary: 'Successfully deployed the application to production using blue-green deployment strategy, ensuring zero downtime and implementing proper rollback procedures with automated health checks.',
              dueAt: '2025-10-20'
            },
            {
              _id: 'static-7',
              title: 'Optimize database queries for performance',
              status: 'pending' as const,
              description: 'Review and optimize slow database queries, add proper indexing, and implement query result caching',
              dueAt: '2025-10-27'
            },
            {
              _id: 'static-8',
              title: 'Implement user feedback collection system',
              status: 'in_progress' as const,
              description: 'Add a comprehensive feedback collection system with surveys, ratings, and user experience analytics',
              dueAt: '2025-10-25'
            },
            {
              _id: 'static-9',
              title: 'Conduct security audit and vulnerability assessment',
              status: 'pending' as const,
              description: 'Perform comprehensive security audit, identify vulnerabilities, and implement necessary security patches',
              dueAt: '2025-10-30'
            },
            {
              _id: 'static-10',
              title: 'Fix mobile responsive design issues',
              status: 'completed' as const,
              description: 'Resolve responsive design problems on mobile devices and tablets across all screen sizes',
              aiSummary: 'Completed mobile responsiveness fixes by implementing flexible grid layouts, optimizing touch interactions, and ensuring consistent UI across all device sizes from 320px to 4K displays.',
              dueAt: '2025-10-21'
            },
            {
              _id: 'static-11',
              title: 'Set up CI/CD pipeline with GitHub Actions',
              status: 'pending' as const,
              description: 'Configure automated testing, building, and deployment pipeline using GitHub Actions and Docker',
              dueAt: '2025-10-29'
            },
            {
              _id: 'static-12',
              title: 'Implement dark mode toggle functionality',
              status: 'in_progress' as const,
              description: 'Add system-aware dark mode toggle with smooth transitions and proper theme persistence',
              dueAt: '2025-10-23'
            }
          ];
        }

        setTasks(convertedTasks);
      } catch (err: unknown) {
        if (!isCancelled) return;
        console.debug('tasks load failed', err instanceof Error ? err.message : String(err));
        setError('Cannot load tasks. You may be offline.');
      } finally {
        if (isCancelled) setLoading(false);
      }
    })();
    return () => { isCancelled = false; };
  }, []);

  const columns: Column[] = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const completed = tasks.filter(t => t.status === 'completed');

    return [
      { id: 'pending', title: 'To Do', tasks: pending },
      { id: 'in_progress', title: 'In Progress', tasks: inProgress },
      { id: 'completed', title: 'Done', tasks: completed },
    ];
  }, [tasks]);

  const remaining = useMemo(() => tasks.filter(t => t.status !== 'completed').length, [tasks]);

  async function addTask() {
    const name = title.trim();
    if (!name) return;
    setTitle('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      const newTask = { ...data.task, status: 'pending' };
      setTasks((prev) => [newTask, ...prev]);
    } catch (err: unknown) {
      console.debug('create task failed', err instanceof Error ? err.message : String(err));
      setError('Unable to create task (maybe offline). It will not persist until you are online.');
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
    // Skip API calls for static tasks
    if (taskId.startsWith('static-')) {
      setTasks((prev) => prev.map(t =>
        t._id === taskId ? { ...t, status: newStatus } : t
      ));
      // Only generate AI summary for completed tasks and only if not already generated
      if (newStatus === 'completed' && !tasks.find(t => t._id === taskId)?.aiSummary) {
        // Add a small delay to avoid generating summary immediately on drag
        setTimeout(() => generateAISummary(taskId), 500);
      }
      return;
    }

    try {
      const completed = newStatus === 'completed';
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setTasks((prev) => prev.map(t =>
        t._id === taskId ? { ...data.task, status: newStatus } : t
      ));

      // Generate AI summary for completed tasks only if not already generated
      if (newStatus === 'completed' && !data.task.aiSummary) {
        // Add a small delay to avoid generating summary immediately on drag
        setTimeout(() => generateAISummary(taskId), 500);
      }
    } catch (err: unknown) {
      console.debug('update task failed', err instanceof Error ? err.message : String(err));
      setError('Failed to update task');
    }
  }

  const generateAISummary = useCallback(async (taskId: string) => {
    setGeneratingSummary(taskId);
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      // For static tasks, generate a simple mock summary
      if (taskId.startsWith('static-')) {
        setTimeout(() => {
          setTasks((prev) => prev.map(t =>
            t._id === taskId ? { ...t, aiSummary: `Task "${t.title}" has been completed successfully.` } : t
          ));
          setGeneratingSummary(null);
        }, 1000); // Simulate API delay
        return;
      }

      const res = await fetch('/api/tasks/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          title: task.title,
          description: task.description || ''
        }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate summary');

      const data = await res.json();
      setTasks((prev) => prev.map(t =>
        t._id === taskId ? { ...t, aiSummary: data.summary } : t
      ));
    } catch (err: unknown) {
      console.debug('AI summary failed', err instanceof Error ? err.message : String(err));
      // Don't show error for AI summary failure, just skip it
    } finally {
      if (!taskId.startsWith('static-')) {
        setGeneratingSummary(null);
      }
    }
  }, [tasks]);

  // Listen for AI summary generation requests
  useEffect(() => {
    const handleGenerateSummary = (e: CustomEvent<string>) => {
      generateAISummary(e.detail);
    };
    window.addEventListener('generate-summary', handleGenerateSummary as EventListener);
    return () => window.removeEventListener('generate-summary', handleGenerateSummary as EventListener);
  }, [generateAISummary]);

  async function deleteTask(id: string) {
    // Skip API calls for static tasks
    if (id.startsWith('static-')) {
      setTasks((prev) => prev.filter(t => t._id !== id));
      return;
    }

    const old = tasks;
    setTasks((prev) => prev.filter(t => t._id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok && res.status !== 204) throw new Error('Failed');
    } catch (err: unknown) {
      setTasks(old);
      console.debug('delete task failed', err instanceof Error ? err.message : String(err));
      setError('Failed to delete task');
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find(t => t._id === active.id);
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
      console.log(`Drag over: moving task ${activeId} from ${activeContainer} to ${overContainer}`);
      setTasks((items) => {
        return items.map(t => {
          if (t._id === activeId) {
            return { ...t, status: overContainer as Task['status'] };
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
      console.log(`Moving task ${activeId} from ${activeContainer} to ${overContainer}`);
      updateTaskStatus(activeId, overContainer as Task['status']);
    }
  }

  function findContainer(id: string) {
    if (id === 'pending' || id === 'in_progress' || id === 'completed') {
      return id;
    }
    return tasks.find(t => t._id === id)?.status;
  }

  // Prevent hydration mismatch by showing loading state until client is ready
  if (!isClientReady || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-pink-900/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1">
                <div className="bg-white dark:bg-slate-800 rounded-full h-full w-full"></div>
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse opacity-20"></div>
            </div>
            <span className="ml-4 text-slate-700 dark:text-slate-300 font-medium">Loading your tasks...</span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'board') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Task Management
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Organize and track your tasks with AI-powered insights
                </p>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                <button
                  className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
                <button
                  className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  onClick={() => setViewMode('board')}
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
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">To Do</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find(col => col.id === 'pending')?.tasks.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-lg">📝</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">In Progress</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find(col => col.id === 'in_progress')?.tasks.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">⚡</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find(col => col.id === 'completed')?.tasks.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">✅</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Task Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
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
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900 dark:border-t-white"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading tasks...</span>
            </div>
          )}

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
              {columns.map(column => {
                return (
                  <div
                    key={column.id}
                    id={column.id}
                    className="flex-shrink-0 w-80"
                  >
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-96 flex flex-col overflow-hidden">
                      {/* Column Header */}
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              column.id === 'pending' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' :
                              column.id === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' :
                              'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              <span className="text-sm">
                                {column.id === 'pending' && '📝'}
                                {column.id === 'in_progress' && '⚡'}
                                {column.id === 'completed' && '✅'}
                              </span>
                            </div>
                            {column.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            column.id === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                            column.id === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                          }`}>
                            {column.tasks.length}
                          </span>
                        </div>
                      </div>

                      {/* Tasks List */}
                      <div className="p-4 flex-1">
                        <SortableContext items={column.tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-3">
                            {column.tasks.map((task) => (
                              <TaskCard
                                key={task._id}
                                task={task}
                                onDelete={deleteTask}
                                generatingSummary={generatingSummary}
                              />
                            ))}
                            {column.tasks.length === 0 && (
                              <div className="text-center py-12">
                                <div className="text-slate-400 dark:text-slate-500">
                                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
              })}
            </div>

            {typeof window !== 'undefined' ? createPortal(
              <DragOverlay>
                {activeTask ? (
                  <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-4 shadow-lg rotate-2">
                    <div className="font-medium text-slate-900 dark:text-white">{activeTask.title}</div>
                    {activeTask.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activeTask.description}</p>
                    )}
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            ) : null}
          </DndContext>
        </div>
      </div>
    );
  }

  // List View (modern design)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Task Management
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Organize and track your tasks with AI-powered insights
              </p>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
              <button
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
              <button
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => setViewMode('board')}
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
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">To Do</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find(col => col.id === 'pending')?.tasks.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">📝</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">In Progress</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find(col => col.id === 'in_progress')?.tasks.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-lg">⚡</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find(col => col.id === 'completed')?.tasks.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">✅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Add Task Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
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
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900 dark:border-t-white"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading tasks...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-16 text-center shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-6xl mb-6 opacity-50">📭</div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No tasks yet</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Create your first task to get started</p>
            </div>
          ) : (
            tasks.map((task, index) => (
              <div
                key={task._id}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={(e) => updateTaskStatus(task._id, e.target.checked ? 'completed' : 'pending')}
                      className="w-5 h-5 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-slate-900 dark:focus:ring-slate-100 focus:ring-2 transition-all duration-200"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg mb-2 ${
                          task.status === 'completed'
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        {task.dueAt && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">📅</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Due {new Date(task.dueAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                          task.status === 'pending'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : task.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                        }`}>
                          {task.status === 'pending' && 'To Do'}
                          {task.status === 'in_progress' && 'In Progress'}
                          {task.status === 'completed' && 'Done'}
                        </span>

                        <button
                          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          onClick={() => deleteTask(task._id)}
                          title="Delete task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* AI Summary for completed tasks */}
                    {task.status === 'completed' && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        {generatingSummary === task._id ? (
                          <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                            <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Generating AI summary...</span>
                          </div>
                        ) : task.aiSummary ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-600 dark:text-emerald-400">🤖</span>
                              <span className="text-emerald-800 dark:text-emerald-200 text-sm font-semibold">AI Summary</span>
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
                              window.dispatchEvent(new CustomEvent('generate-summary', { detail: task._id }));
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
    </div>
  );
}

function TaskCard({ task, onDelete, generatingSummary }: {
  task: Task;
  onDelete: (id: string) => void;
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
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${task.status === 'completed' ? 'opacity-75' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className={`font-medium text-slate-900 dark:text-white mb-2 ${
            task.status === 'completed' ? 'line-through text-slate-500 dark:text-slate-400' : ''
          }`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              {task.description}
            </p>
          )}
          {task.dueAt && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">📅</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {new Date(task.dueAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <button
          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200 ml-2"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
          title="Delete task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
          task.status === 'pending'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
            : task.status === 'in_progress'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
        }`}>
          {task.status === 'pending' && 'To Do'}
          {task.status === 'in_progress' && 'In Progress'}
          {task.status === 'completed' && 'Done'}
        </span>
      </div>

      <AnimatePresence>
        {task.status === 'completed' && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            {generatingSummary === task._id ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent"></div>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">Generating AI summary...</span>
              </div>
            ) : task.aiSummary ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs">🤖</span>
                  <span className="text-emerald-800 dark:text-emerald-200 text-xs font-semibold">AI Summary</span>
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
                  window.dispatchEvent(new CustomEvent('generate-summary', { detail: task._id }));
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
