"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Course {
  id: string;
  name: string;
  section?: string;
  description?: string;
  room?: string;
  owner_id?: string;
  course_state?: string;
  alternate_link?: string;
}

interface Assignment {
  id: string;
  course_id: string;
  course_name?: string;
  title: string;
  description?: string;
  state?: string;
  due_date?: {
    year: number;
    month: number;
    day: number;
  };
  due_time?: {
    hours?: number;
    minutes?: number;
  };
  max_points?: number;
  work_type?: string;
  alternate_link?: string;
}

interface Progress {
  total_courses: number;
  total_assignments: number;
  completed_assignments: number;
  pending_assignments: number;
  completion_rate: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
}

export function useGoogleClassroom() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/classroom/status`);
      if (!response.ok) {
        // Backend is down, just set as not connected
        setIsConnected(false);
        return;
      }
      const data = await response.json();
      setIsConnected(data.connected);
      
      if (data.connected) {
        // Fetch user profile
        try {
          const profileResponse = await fetch(`${API_BASE}/classroom/profile`);
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            setUser(profile);
          }
        } catch (e) {
          console.error("Failed to fetch profile:", e);
        }
      }
    } catch (e) {
      // Backend is down, just set as not connected
      setIsConnected(false);
      setError(null); // Clear any previous errors
    } finally {
      setIsLoading(false);
    }
  };

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/classroom/connect`);
      if (!response.ok) {
        throw new Error(`Backend unavailable (${response.status})`);
      }
      const data = await response.json();
      
      // Open OAuth URL in new window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const oauthWindow = window.open(
        data.auth_url,
        "Google Classroom Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Poll for connection status
      const pollInterval = setInterval(async () => {
        if (oauthWindow?.closed) {
          clearInterval(pollInterval);
          await checkConnection();
        }
      }, 1000);
      
      return data.auth_url;
    } catch (_) {
      setError("Backend server is not available. Google Classroom requires the backend to be running.");
    
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/classroom/disconnect`, { method: "POST" });
      setIsConnected(false);
      setUser(null);
    } catch (e) {
      setError("Failed to disconnect");
    }
  }, []);

  const fetchCourses = useCallback(async (): Promise<Course[]> => {
    try {
      const response = await fetch(`${API_BASE}/classroom/courses`);
      if (!response.ok) throw new Error("Failed to fetch courses");
      return await response.json();
    } catch (e) {
      setError("Failed to fetch courses");
      return [];
    }
  }, []);

  const fetchAssignments = useCallback(async (courseId?: string): Promise<Assignment[]> => {
    try {
      const url = courseId 
        ? `${API_BASE}/classroom/courses/${courseId}/assignments`
        : `${API_BASE}/classroom/assignments`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return await response.json();
    } catch (e) {
      setError("Failed to fetch assignments");
      return [];
    }
  }, []);

  const fetchProgress = useCallback(async (): Promise<Progress | null> => {
    try {
      const response = await fetch(`${API_BASE}/classroom/progress`);
      if (!response.ok) throw new Error("Failed to fetch progress");
      return await response.json();
    } catch (e) {
      setError("Failed to fetch progress");
      return null;
    }
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    user,
    connect,
    disconnect,
    fetchCourses,
    fetchAssignments,
    fetchProgress,
    refresh: checkConnection,
  };
}
