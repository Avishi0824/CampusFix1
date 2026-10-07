import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { SupabaseApiService } from '../services/supabaseApi';
import { useAuth } from './AuthContext';

const ComplaintsContext = createContext(undefined);

export const ComplaintsProvider = ({ children }) => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshComplaints = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        fetchedComplaints,
        fetchedStaff,
        fetchedAnalytics,
      ] = await Promise.all([
        SupabaseApiService.getComplaints(),
        SupabaseApiService.getStaff(),
        SupabaseApiService.getAnalytics(),
      ]);

      setComplaints(fetchedComplaints);
      setStaff(fetchedStaff);
      setAnalytics(fetchedAnalytics);
    } catch (e) {
      console.warn('Error refreshing complaints:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshComplaints();
  }, [refreshComplaints]);

  // --------------------------------------------------
  // DUPLICATE COMPLAINT DETECTION
  // --------------------------------------------------

  const checkDuplicateComplaint = (input) => {
    /*
     * Only these complaints should prevent a new
     * complaint from being considered a duplicate.
     *
     * Once a complaint is resolved, the student
     * should be able to report the same problem again.
     */
    const activeStatuses = [
      'REPORTED',
      'ASSIGNED',
      'IN_PROGRESS',
    ];

    /*
     * Convert text into simple keywords.
     *
     * Example:
     * "Bathroom tap is leaking!"
     *
     * becomes:
     * ["bathroom", "tap", "is", "leaking"]
     */
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 2);
    };

    /*
     * Combine title + description because a student
     * may write important information in either field.
     */
    const newComplaintWords = new Set([
      ...normalizeText(input.title),
      ...normalizeText(input.description),
    ]);

    /*
     * First filter complaints by:
     *
     * SAME HOSTEL
     * SAME ROOM
     * SAME CATEGORY
     * ACTIVE STATUS
     *
     * This is important because roommates can still
     * submit completely different complaints.
     */
    const possibleDuplicates = complaints.filter((complaint) => {
      const sameHostel =
        complaint.hostelBlock.trim().toLowerCase() ===
        input.hostelBlock.trim().toLowerCase();

      const sameRoom =
        complaint.roomNumber.trim().toLowerCase() ===
        input.roomNumber.trim().toLowerCase();

      const sameCategory =
        complaint.category === input.category;

      const isActive =
        activeStatuses.includes(complaint.status);

      return (
        sameHostel &&
        sameRoom &&
        sameCategory &&
        isActive
      );
    });

    let bestMatch;
    let bestScore = 0;

    /*
     * Compare the new complaint against every
     * possible complaint from the same room/category.
     */
    possibleDuplicates.forEach((complaint) => {
      const existingWords = new Set([
        ...normalizeText(complaint.title),
        ...normalizeText(complaint.description),
      ]);

      let matchingWords = 0;

      newComplaintWords.forEach((word) => {
        if (existingWords.has(word)) {
          matchingWords++;
        }
      });

      /*
       * Calculate basic text similarity.
       */
      const textSimilarity =
        newComplaintWords.size > 0
          ? matchingWords / newComplaintWords.size
          : 0;

      /*
       * Score:
       *
       * Same room      = 40 points
       * Same category  = 25 points
       * Text similarity = up to 35 points
       *
       * Maximum = 100
       */
      const score =
        40 +
        25 +
        textSimilarity * 35;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = complaint;
      }
    });

    /*
     * 80+ means we consider it a duplicate.
     */
    const isDuplicate = bestScore >= 80;

    return {
      isDuplicate,
      confidence: Math.round(bestScore),
      existingComplaint: bestMatch,
    };
  };

  // --------------------------------------------------
  // CREATE COMPLAINT
  // --------------------------------------------------

  const createComplaint = async (input) => {
    if (!user) {
      throw new Error(
        'User must be logged in to create complaint'
      );
    }

    const newComplaint =
      await SupabaseApiService.createComplaint(
        input,
        user
      );

    await refreshComplaints();

    return newComplaint;
  };

  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  const updateStatus = async (
    id,
    status,
    notes,
    image
  ) => {
    if (!user) {
      throw new Error(
        'User must be logged in to update status'
      );
    }

    const updated =
      await SupabaseApiService.updateComplaintStatus(
        id,
        status,
        user,
        notes,
        image
      );

    await refreshComplaints();

    return updated;
  };

  // --------------------------------------------------
  // ASSIGN TECHNICIAN
  // --------------------------------------------------

  const assignTechnician = async (
    complaintId,
    technicianId,
    priorityOverride
  ) => {
    if (!user) {
      throw new Error(
        'User must be logged in to assign technician'
      );
    }

    const updated =
      await SupabaseApiService.assignTechnician(
        complaintId,
        technicianId,
        user,
        priorityOverride
      );

    await refreshComplaints();

    return updated;
  };

  // --------------------------------------------------
  // ADD COMMENT
  // --------------------------------------------------

  const addComment = async (
    complaintId,
    message
  ) => {
    if (!user) {
      throw new Error(
        'User must be logged in to add comment'
      );
    }

    const updated =
      await SupabaseApiService.addComplaintComment(
        complaintId,
        user,
        message
      );

    await refreshComplaints();

    return updated;
  };

  // --------------------------------------------------
  // GET COMPLAINT BY ID
  // --------------------------------------------------

  const getComplaintById = (id) => {
    return complaints.find(
      (c) =>
        c.id === id ||
        c.ticketNumber === id
    );
  };

  return (
    <ComplaintsContext.Provider
      value={{
        complaints,
        staff,
        analytics,
        isLoading,
        refreshComplaints,
        createComplaint,
        checkDuplicateComplaint,
        updateStatus,
        assignTechnician,
        addComment,
        getComplaintById,
      }}
    >
      {children}
    </ComplaintsContext.Provider>
  );
};

export const useComplaints = () => {
  const context = useContext(ComplaintsContext);

  if (!context) {
    throw new Error(
      'useComplaints must be used within a ComplaintsProvider'
    );
  }

  return context;
};