import { supabase } from './supabase';

const mapComplaint = (complaint, comments = [], timeline = []) => {
  const technician = complaint.assigned_technician;

  return {
    id: complaint.id,
    ticketNumber: complaint.ticket_number,

    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    priority: complaint.priority,
    status: complaint.status,

    location: `${complaint.hostel}, Room ${complaint.room}`,
    hostelBlock: complaint.hostel,
    roomNumber: complaint.room,

    studentId: complaint.student_id,
    studentName: complaint.student?.name || '',
    studentContact: complaint.student?.phone || '',

    assignedTechnicianId:
      complaint.assigned_technician_id || undefined,

    assignedTechnicianName:
      technician?.profile?.name || undefined,

    assignedTechnicianSpecialization:
      technician?.specialization_label || undefined,

    assignedTechnicianPhone:
      technician?.profile?.phone || undefined,

    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at,

    resolvedAt: complaint.resolved_at || undefined,

    images: complaint.images || [],
    isEmergency: complaint.is_emergency || false,

    resolutionNotes:
      complaint.resolution_notes || undefined,

    resolutionImage:
      complaint.resolution_image || undefined,

    timeline: timeline.map((item) => ({
      id: item.id,
      status: item.status,
      title: item.note || 'Status Updated',
      description: item.note || '',
      timestamp: item.created_at,
      actorName: item.actor?.name || '',
      actorRole: item.actor?.role?.toLowerCase() || '',
    })),

    comments: comments.map((item) => ({
      id: item.id,
      authorId: item.user_id,
      authorName: item.author?.name || '',
      authorRole: item.author?.role?.toLowerCase() || '',
      message: item.comment,
      timestamp: item.created_at,
    })),
  };
};

const getComplaintRelations = async (complaints) => {
  if (!complaints.length) {
    return [];
  }

  const complaintIds = complaints.map((complaint) => complaint.id);

  const [
    { data: comments, error: commentsError },
    { data: timeline, error: timelineError },
  ] = await Promise.all([
    supabase
      .from('complaint_comments')
      .select(`
        *,
        author:profiles!complaint_comments_user_id_fkey (
          name,
          role
        )
      `)
      .in('complaint_id', complaintIds)
      .order('created_at', { ascending: true }),

    supabase
      .from('complaint_timeline')
      .select(`
        *,
        actor:profiles!complaint_timeline_changed_by_fkey (
          name,
          role
        )
      `)
      .in('complaint_id', complaintIds)
      .order('created_at', { ascending: true }),
  ]);

  if (commentsError) {
    throw commentsError;
  }

  if (timelineError) {
    throw timelineError;
  }

  return complaints.map((complaint) => {
    const complaintComments =
      comments.filter(
        (comment) =>
          comment.complaint_id === complaint.id
      );

    const complaintTimeline =
      timeline.filter(
        (event) =>
          event.complaint_id === complaint.id
      );

    return mapComplaint(
      complaint,
      complaintComments,
      complaintTimeline
    );
  });
};

export const SupabaseApiService = {
  async getComplaints() {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        student:profiles!complaints_student_id_fkey (
          name,
          phone
        ),
        assigned_technician:technicians!complaints_assigned_technician_id_fkey (
          specialization,
          specialization_label,
          profile:profiles!technicians_profile_id_fkey (
            name,
            phone
          )
        )
      `)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return getComplaintRelations(data || []);
  },

  async getComplaintById(id) {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        student:profiles!complaints_student_id_fkey (
          name,
          phone
        ),
        assigned_technician:technicians!complaints_assigned_technician_id_fkey (
          specialization,
          specialization_label,
          profile:profiles!technicians_profile_id_fkey (
            name,
            phone
          )
        )
      `)
      .or(`id.eq.${id},ticket_number.eq.${id}`)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const result = await getComplaintRelations([data]);

    return result[0] || null;
  },

  async createComplaint(input, student) {
    const now = new Date().toISOString();

    const ticketNumber = `CF-${Date.now()}`;

    const complaint = {
      id: `cf_${Date.now()}`,
      ticket_number: ticketNumber,

      student_id: student.id,

      hostel: input.hostelBlock,
      room: input.roomNumber,

      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),

      priority: input.priority,
      status: 'REPORTED',

      images: input.images || [],
      is_emergency: input.isEmergency || false,

      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('complaints')
      .insert(complaint)
      .select(`
        *,
        student:profiles!complaints_student_id_fkey (
          name,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    await supabase
      .from('complaint_timeline')
      .insert({
        complaint_id: data.id,
        status: 'REPORTED',
        changed_by: student.id,
        note: `Ticket created for ${input.category
          .toLowerCase()
          .replace('_', ' ')} issue in ${
          input.hostelBlock
        }.`,
      });

    return this.getComplaintById(data.id);
  },

  async updateComplaintStatus(
    complaintId,
    newStatus,
    actor,
    notes,
    image
  ) {
    const now = new Date().toISOString();

    let eventTitle = 'Status Updated';
    let eventDesc = `Status changed to ${newStatus}`;

    if (newStatus === 'IN_PROGRESS') {
      eventTitle = 'Work Started';
      eventDesc =
        notes ||
        'Technician has commenced work on site.';
    } else if (newStatus === 'RESOLVED') {
      eventTitle = 'Work Resolved';
      eventDesc =
        notes ||
        'Issue verified and marked resolved.';
    }

    const updates = {
      status: newStatus,
      updated_at: now,
      resolution_notes: notes || null,
      resolution_image: image || null,
    };

    if (newStatus === 'RESOLVED') {
      updates.resolved_at = now;
    }

    const { data, error } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaintId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    await supabase
      .from('complaint_timeline')
      .insert({
        complaint_id: complaintId,
        status: newStatus,
        changed_by: actor.id,
        note: `${eventTitle}: ${eventDesc}`,
      });

    return this.getComplaintById(complaintId);
  },

  async assignTechnician(
    complaintId,
    technicianId,
    actor,
    priorityOverride
  ) {
    const { data: technician, error: technicianError } =
      await supabase
        .from('technicians')
        .select(`
          *,
          profile:profiles!technicians_profile_id_fkey (
            name,
            phone
          )
        `)
        .eq('id', technicianId)
        .maybeSingle();

    if (technicianError) {
      throw technicianError;
    }

    if (!technician) {
      return null;
    }

    const now = new Date().toISOString();

    const updates = {
      status: 'ASSIGNED',
      assigned_technician_id: technicianId,
      updated_at: now,
    };

    if (priorityOverride) {
      updates.priority = priorityOverride;
    }

    const { data, error } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaintId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    await supabase
      .from('complaint_timeline')
      .insert({
        complaint_id: complaintId,
        status: 'ASSIGNED',
        changed_by: actor.id,
        note: `Technician Assigned: Assigned to ${
          technician.profile?.name || ''
        } (${
          technician.specialization_label || ''
        }).`,
      });

    return this.getComplaintById(complaintId);
  },

  async addComplaintComment(
    complaintId,
    author,
    message
  ) {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('complaint_comments')
      .insert({
        complaint_id: complaintId,
        user_id: author.id,
        comment: message.trim(),
        created_at: now,
      });

    if (error) {
      throw error;
    }

    await supabase
      .from('complaints')
      .update({
        updated_at: now,
      })
      .eq('id', complaintId);

    return this.getComplaintById(complaintId);
  },

  async getStaff() {
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        id,
        specialization,
        specialization_label,
        active_tasks_count,
        rating,
        availability,
        profile:profiles!technicians_profile_id_fkey (
          name,
          email,
          phone
        )
      `)
      .order('id');

    if (error) {
      throw error;
    }

    return (data || []).map((technician) => ({
      id: technician.id,
      name: technician.profile?.name || '',
      email: technician.profile?.email || '',
      phone: technician.profile?.phone || '',
      specialization: technician.specialization,
      specializationLabel:
        technician.specialization_label,
      activeTasksCount:
        technician.active_tasks_count || 0,
      completedTasksCount: 0,
      rating: Number(technician.rating || 0),
      isAvailable:
        technician.availability === 'AVAILABLE',
    }));
  },

  async getAnalytics() {
    const complaints = await this.getComplaints();

    const statusCounts = {
      REPORTED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };

    const categoryMap = {
      PLUMBING: 0,
      ELECTRICAL: 0,
      FURNITURE: 0,
      INTERNET_WIFI: 0,
      CLEANING: 0,
      HVAC_AIR: 0,
      SECURITY: 0,
      OTHER: 0,
    };

    const hostelMap = {};

    let highPriorityCount = 0;
    let unassignedCount = 0;

    complaints.forEach((c) => {
      statusCounts[c.status] =
        (statusCounts[c.status] || 0) + 1;

      categoryMap[c.category] =
        (categoryMap[c.category] || 0) + 1;

      hostelMap[c.hostelBlock] =
        (hostelMap[c.hostelBlock] || 0) + 1;

      if (
        c.priority === 'HIGH' &&
        c.status !== 'RESOLVED'
      ) {
        highPriorityCount++;
      }

      if (
        !c.assignedTechnicianId &&
        c.status === 'REPORTED'
      ) {
        unassignedCount++;
      }
    });

    const categoryLabels = {
      PLUMBING: 'Plumbing',
      ELECTRICAL: 'Electrical',
      FURNITURE: 'Furniture & Fixtures',
      INTERNET_WIFI: 'Wi-Fi / Network',
      CLEANING: 'Housekeeping',
      HVAC_AIR: 'Air / HVAC',
      SECURITY: 'Locks & Security',
      OTHER: 'General Maintenance',
    };

    const total = complaints.length || 1;

    const categoryBreakdown = Object.keys(
      categoryMap
    ).map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      count: categoryMap[cat],
      percentage: Math.round(
        (categoryMap[cat] / total) * 100
      ),
    }));

    const hostelBreakdown = Object.entries(
      hostelMap
    ).map(([block, count]) => ({
      block,
      count,
    }));

    return {
      totalComplaints: complaints.length,
      openComplaints:
        statusCounts.REPORTED +
        statusCounts.ASSIGNED,
      inProgressComplaints:
        statusCounts.IN_PROGRESS,
      resolvedComplaints:
        statusCounts.RESOLVED,
      highPriorityCount,
      unassignedCount,
      avgResolutionHours: 3.4,
      categoryBreakdown,
      statusBreakdown: statusCounts,
      hostelBreakdown,
    };
  },
};