import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Reclamation from '@/models/Reclamation';

export const dynamic = 'force-dynamic';

// GET - Get a single reclamation
export async function GET(req, { params }) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

  const { id } = await params;
    const reclamation = await Reclamation.findOne({ _id: id, userId: user._id }).lean();

    if (!reclamation) {
      return NextResponse.json({ error: 'Reclamation not found' }, { status: 404 });
    }

    return NextResponse.json({ reclamation });
  } catch (e) {
    console.error('GET /api/reclamations/[id] error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch reclamation' },
      { status: 500 }
    );
  }
}

// PATCH - Update a reclamation
export async function PATCH(req, { params }) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

  const { id } = await params;
    const body = await req.json();
    const { title, description, category, priority } = body;

    const reclamation = await Reclamation.findOne({ _id: id, userId: user._id });

    if (!reclamation) {
      return NextResponse.json({ error: 'Reclamation not found' }, { status: 404 });
    }

    // Don't allow updates if already resolved or closed
    if (reclamation.status === 'resolved' || reclamation.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot update resolved or closed reclamations' },
        { status: 400 }
      );
    }

    if (title) reclamation.title = title;
    if (description) reclamation.description = description;
    if (category) reclamation.category = category;
    if (priority) reclamation.priority = priority;

    await reclamation.save();

    return NextResponse.json({ reclamation });
  } catch (e) {
    console.error('PATCH /api/reclamations/[id] error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to update reclamation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reclamation
export async function DELETE(req, { params }) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

  const { id } = await params;
    const reclamation = await Reclamation.findOne({ _id: id, userId: user._id });

    if (!reclamation) {
      return NextResponse.json({ error: 'Reclamation not found' }, { status: 404 });
    }

    await reclamation.deleteOne();

    return NextResponse.json({ message: 'Reclamation deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/reclamations/[id] error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to delete reclamation' },
      { status: 500 }
    );
  }
}
