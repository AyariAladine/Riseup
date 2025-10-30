import { notFound } from 'next/navigation';
import { getTaskById } from '@/lib/task-data';
import TaskDetailClient from './TaskDetailClient';

function toSerializableTask(task: any) {
  return {
    ...task,
    _id: task._id?.toString?.() || String(task._id),
    userId: task.userId?.toString?.() || String(task.userId),
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
    user: undefined,
    aiRecommendationData: undefined,
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const task = await getTaskById(params.id);
  if (!task) return notFound();
  return <TaskDetailClient task={toSerializableTask(task)} />;
}
