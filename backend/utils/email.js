import nodemailer from 'nodemailer';

// Helper to create transporter
const getTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

// Send email helper
const sendMail = async (options) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('----------------------------- SIMULATED EMAIL -----------------------------');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: \n${options.text || options.html}`);
    console.log('---------------------------------------------------------------------------');
    return { messageId: 'simulated-id' };
  }

  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME || 'ResiSolve System'} <${process.env.SMTP_FROM_EMAIL || 'noreply@resisolve.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email sent successfully: ${info.messageId}`);
  return info;
};

// 1. Complaint Status Change Notification
export const sendComplaintStatusEmail = async ({ email, name, complaintTitle, status, note }) => {
  const subject = `Complaint Status Updated: ${complaintTitle}`;
  const statusColors = {
    'Open': '#eab308', // Yellow
    'In Progress': '#3b82f6', // Blue
    'Resolved': '#22c55e' // Green
  };
  const color = statusColors[status] || '#6b7280';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">ResiSolve Maintenance Update</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>The status of your complaint has been updated by the society administrator.</p>
      
      <div style="background-color: #f9fafb; border-left: 4px solid #1e3a8a; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Complaint:</strong> ${complaintTitle}</p>
        <p style="margin: 0 0 8px 0;"><strong>New Status:</strong> <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${status}</span></p>
        ${note ? `<p style="margin: 0;"><strong>Admin Note:</strong> ${note}</p>` : ''}
      </div>
      
      <p>You can track the full progress and status history of this complaint on the ResiSolve portal.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
        This is an automated email from ResiSolve Society Maintenance System. Please do not reply.
      </p>
    </div>
  `;

  return sendMail({
    to: email,
    subject,
    html,
    text: `Dear ${name}, the status of your complaint "${complaintTitle}" has been changed to ${status}. Admin note: ${note || 'None'}`
  });
};

// 2. New Pinned Notice Notification
export const sendImportantNoticeEmail = async ({ emails, noticeTitle, noticeContent, authorName }) => {
  if (!emails || emails.length === 0) return;

  const subject = `Urgent Notice: ${noticeTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; border-radius: 8px; background-color: #fffbeb;">
      <h2 style="color: #b91c1c; border-bottom: 2px solid #fca5a5; padding-bottom: 10px; margin-top: 0;">⚠️ Important Society Announcement</h2>
      <p>Dear Resident,</p>
      <p>An important notice has been posted on the ResiSolve notice board by the administrator (<strong>${authorName}</strong>).</p>
      
      <div style="background-color: #ffffff; border: 1px solid #fcd34d; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #b45309;">${noticeTitle}</h3>
        <p style="margin: 0; line-height: 1.6; color: #1f2937; white-space: pre-line;">${noticeContent}</p>
      </div>
      
      <p>Please log in to the ResiSolve platform to view the notice board and stay informed.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center;">
        This is an automated notice notification from ResiSolve Society Maintenance System.
      </p>
    </div>
  `;

  // Standard nodemailer can take an array of emails in the 'to' or 'bcc' field
  // It's safer to send it to residents via 'bcc' so they don't see each other's emails
  return sendMail({
    to: emails.join(','),
    subject,
    html,
    text: `Important Notice posted: ${noticeTitle}\n\n${noticeContent}`
  });
};
