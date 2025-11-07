import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Reclamation from '@/models/Reclamation';
import nodemailer from 'nodemailer';
import { notifyReclamationSubmitted } from '@/lib/notification-helper';

export const dynamic = 'force-dynamic';

// GET - List all reclamations for the current user
export async function GET(req) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    const reclamations = await Reclamation.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ reclamations });
  } catch (e) {
    console.error('GET /api/reclamations error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch reclamations' },
      { status: 500 }
    );
  }
}

// POST - Create a new reclamation
export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    const body = await req.json();
    const { title, description, category = 'other', priority = 'medium' } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 chars)' }, { status: 400 });
    }

    if (description.length > 2000) {
      return NextResponse.json({ error: 'Description too long (max 2000 chars)' }, { status: 400 });
    }

    const reclamation = await Reclamation.create({
      userId: user._id,
      title,
      description,
      category,
      priority,
      status: 'pending',
    });

    // Send email notification to owner
    try {
      if (process.env.GMAIL_USER && process.env.GMAIL_PASS && process.env.OWNER_EMAIL) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        });

        const priorityEmoji = {
          low: '🟢',
          medium: '🟡',
          high: '🔴'
        };

        const categoryLabel = {
          technical: 'Technical Issue',
          billing: 'Billing',
          feature: 'Feature Request',
          bug: 'Bug Report',
          other: 'Other'
        };

        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: process.env.OWNER_EMAIL,
          subject: `🚨 New Reclamation: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1f6feb; margin-top: 0; border-bottom: 2px solid #1f6feb; padding-bottom: 10px;">
                  🆕 New Reclamation Submitted
                </h2>
                
                <div style="background: #f6f8fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #24292f;">${title}</h3>
                  <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 14px;">
                    <span style="background: #ddf4ff; padding: 4px 8px; border-radius: 4px;">
                      ${priorityEmoji[priority] || '⚪'} ${priority.toUpperCase()}
                    </span>
                    <span style="background: #fff8c5; padding: 4px 8px; border-radius: 4px;">
                      📁 ${categoryLabel[category] || category}
                    </span>
                    <span style="background: #e6f3ff; padding: 4px 8px; border-radius: 4px;">
                      ⏱️ ${new Date().toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style="margin: 20px 0;">
                  <h4 style="color: #24292f; margin-bottom: 10px;">📝 Description:</h4>
                  <div style="background: #f6f8fa; padding: 15px; border-radius: 6px; border-left: 4px solid #1f6feb;">
                    <p style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${description}</p>
                  </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #fff8e1; border-radius: 6px; border-left: 4px solid #ff9800;">
                  <h4 style="color: #24292f; margin: 0 0 10px 0;">👤 Submitted by:</h4>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${user?.name || 'Unknown'}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${user?.email}" style="color: #1f6feb;">${user?.email || 'N/A'}</a></p>
                  <p style="margin: 5px 0;"><strong>Premium:</strong> ${user?.isPremium ? '⭐ Yes' : '❌ No'}</p>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; text-align: center;">
                  <p style="color: #57606a; font-size: 14px; margin: 0;">
                    This is an automated notification from <strong>RiseUP</strong> Learning Platform
                  </p>
                </div>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Reclamation email sent successfully to:', process.env.OWNER_EMAIL);
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('❌ Failed to send reclamation email:', emailError?.message || emailError);
    }

    // Send push notification to user
    try {
      await notifyReclamationSubmitted(user._id.toString(), title);
    } catch (notifError) {
      console.error('❌ Failed to send reclamation push notification:', notifError);
    }

    return NextResponse.json({ reclamation }, { status: 201 });
  } catch (e) {
    console.error('POST /api/reclamations error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to create reclamation' },
      { status: 500 }
    );
  }
}
