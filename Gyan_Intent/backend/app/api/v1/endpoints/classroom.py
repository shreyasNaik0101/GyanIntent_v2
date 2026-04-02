"""Google Classroom API endpoints."""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import secrets
import json

from app.services.google_classroom import google_classroom_service

router = APIRouter()

# In-memory storage for OAuth states and tokens (use Redis in production)
oauth_states = {}
user_tokens = {}


class TokenData(BaseModel):
    """Token data for Google OAuth."""
    access_token: str
    refresh_token: Optional[str] = None
    token_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scopes: Optional[List[str]] = None
    expiry: Optional[str] = None


class ConnectResponse(BaseModel):
    """Response for connect endpoint."""
    auth_url: str
    state: str


class CourseResponse(BaseModel):
    """Course response model."""
    id: str
    name: str
    section: Optional[str] = None
    description: Optional[str] = None
    room: Optional[str] = None
    owner_id: Optional[str] = None
    course_state: Optional[str] = None
    alternate_link: Optional[str] = None


class AssignmentResponse(BaseModel):
    """Assignment response model."""
    id: str
    course_id: str
    course_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    state: Optional[str] = None
    due_date: Optional[Dict[str, int]] = None
    due_time: Optional[Dict[str, int]] = None
    max_points: Optional[float] = None
    work_type: Optional[str] = None
    alternate_link: Optional[str] = None


class SubmissionSummary(BaseModel):
    """Summary of a single assignment submission."""
    assignment_id: str
    assignment_title: str
    state: str  # TURNED_IN, RETURNED, CREATED, etc.
    late: bool = False
    assigned_grade: Optional[float] = None
    max_points: Optional[float] = None


class CourseProgressResponse(BaseModel):
    """Course with real progress data from Classroom."""
    id: str
    name: str
    section: Optional[str] = None
    description: Optional[str] = None
    room: Optional[str] = None
    alternate_link: Optional[str] = None
    total_assignments: int = 0
    submitted_assignments: int = 0
    graded_assignments: int = 0
    completion_rate: float = 0.0
    submissions: List[SubmissionSummary] = []


class UserProfile(BaseModel):
    """User profile response."""
    id: str
    name: str
    email: str
    photo_url: Optional[str] = None


@router.get("/connect", response_model=ConnectResponse)
async def connect_google_classroom():
    """Initiate Google Classroom OAuth flow."""
    # Generate a random state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Get authorization URL
    auth_url = google_classroom_service.get_auth_url(state=state)
    
    # Store state for later verification
    oauth_states[state] = True
    
    return ConnectResponse(auth_url=auth_url, state=state)


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """Handle OAuth callback from Google."""
    if error:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"http://localhost:3000/dashboard/courses?error={error}"
        )
    
    # Verify state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    # Remove used state
    del oauth_states[state]
    
    try:
        # Exchange code for tokens (pass state so PKCE flow is reused)
        token_data = google_classroom_service.exchange_code(code, state=state)
        
        # Store tokens (in production, use database with user association)
        user_id = "current_user"  # Replace with actual user ID
        user_tokens[user_id] = token_data
        
        # Redirect to frontend with success
        return RedirectResponse(
            url=f"http://localhost:3000/dashboard/courses?connected=true"
        )
        
    except Exception as e:
        return RedirectResponse(
            url=f"http://localhost:3000/dashboard/courses?error={str(e)}"
        )


@router.post("/tokens")
async def store_tokens(token_data: TokenData):
    """Store Google tokens for a user (alternative to callback)."""
    user_id = "current_user"  # Replace with actual user ID
    user_tokens[user_id] = token_data.dict()
    return {"status": "success", "message": "Tokens stored successfully"}


@router.get("/status")
async def get_connection_status():
    """Check if user is connected to Google Classroom."""
    user_id = "current_user"
    is_connected = user_id in user_tokens and user_tokens[user_id] is not None
    return {"connected": is_connected}


@router.post("/disconnect")
async def disconnect_google_classroom():
    """Disconnect from Google Classroom."""
    user_id = "current_user"
    if user_id in user_tokens:
        del user_tokens[user_id]
    return {"status": "success", "message": "Disconnected from Google Classroom"}


@router.get("/profile", response_model=UserProfile)
async def get_user_profile():
    """Get authenticated user's Google profile."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        profile = await google_classroom_service.get_user_profile(credentials)
        return UserProfile(**profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses", response_model=List[CourseResponse])
async def get_courses():
    """Fetch all courses from Google Classroom."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        courses = await google_classroom_service.get_courses(credentials)
        return [CourseResponse(**course) for course in courses]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/progress", response_model=List[CourseProgressResponse])
async def get_courses_with_progress():
    """Fetch all courses enriched with real assignment/submission progress."""
    user_id = "current_user"

    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")

    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        courses = await google_classroom_service.get_courses(credentials)
        results = []

        for course in courses:
            cid = course["id"]
            # Fetch assignments for this course
            try:
                assignments = await google_classroom_service.get_course_work(credentials, cid)
            except Exception:
                assignments = []

            # Build assignment title lookup
            assignment_map = {a["id"]: a for a in assignments}

            # Fetch my submissions for this course (coursework_id="-" = all)
            try:
                submissions = await google_classroom_service.get_student_submissions(credentials, cid)
            except Exception:
                submissions = []

            submitted_count = 0
            graded_count = 0
            sub_summaries = []

            for sub in submissions:
                cw_id = sub.get("course_work_id") or sub.get("courseWorkId")
                asg = assignment_map.get(cw_id, {})
                sub_state = sub.get("state", "CREATED")

                is_submitted = sub_state in ("TURNED_IN", "RETURNED")
                is_graded = sub.get("assigned_grade") is not None or sub.get("assignedGrade") is not None

                if is_submitted:
                    submitted_count += 1
                if is_graded:
                    graded_count += 1

                sub_summaries.append(SubmissionSummary(
                    assignment_id=cw_id or "",
                    assignment_title=asg.get("title", "Unknown"),
                    state=sub_state,
                    late=bool(sub.get("late", False)),
                    assigned_grade=sub.get("assigned_grade") or sub.get("assignedGrade"),
                    max_points=asg.get("max_points"),
                ))

            total = len(assignments)
            rate = (submitted_count / total * 100) if total > 0 else 0.0

            results.append(CourseProgressResponse(
                id=cid,
                name=course["name"],
                section=course.get("section"),
                description=course.get("description"),
                room=course.get("room"),
                alternate_link=course.get("alternate_link"),
                total_assignments=total,
                submitted_assignments=submitted_count,
                graded_assignments=graded_count,
                completion_rate=round(rate, 1),
                submissions=sub_summaries,
            ))

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}/assignments", response_model=List[AssignmentResponse])
async def get_course_assignments(course_id: str):
    """Fetch assignments for a specific course."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        coursework = await google_classroom_service.get_course_work(credentials, course_id)
        return [AssignmentResponse(**work) for work in coursework]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assignments", response_model=List[AssignmentResponse])
async def get_all_assignments():
    """Fetch all assignments across all courses."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        assignments = await google_classroom_service.get_all_assignments(credentials)
        return [AssignmentResponse(**assignment) for assignment in assignments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assignments/enriched")
async def get_enriched_assignments():
    """Fetch all assignments with real submission status (pending/submitted/graded)."""
    user_id = "current_user"

    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")

    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        courses = await google_classroom_service.get_courses(credentials)

        enriched = []
        for course in courses:
            cid = course["id"]
            try:
                works = await google_classroom_service.get_course_work(credentials, cid)
            except Exception:
                works = []

            # Build map of coursework id -> work
            work_map = {w["id"]: w for w in works}

            try:
                submissions = await google_classroom_service.get_student_submissions(credentials, cid)
            except Exception:
                submissions = []

            # Map submission to its coursework
            sub_by_cw = {}
            for s in submissions:
                cw_id = s.get("course_work_id") or s.get("courseWorkId")
                if cw_id:
                    sub_by_cw[cw_id] = s

            for w in works:
                sub = sub_by_cw.get(w["id"], {})
                sub_state = sub.get("state", "CREATED")
                grade = sub.get("assigned_grade") or sub.get("assignedGrade")

                if grade is not None:
                    status = "graded"
                elif sub_state in ("TURNED_IN", "RETURNED"):
                    status = "submitted"
                elif sub.get("late"):
                    status = "late"
                else:
                    status = "pending"

                enriched.append({
                    "id": w["id"],
                    "title": w.get("title", "Untitled"),
                    "course_id": cid,
                    "course_name": course["name"],
                    "description": w.get("description"),
                    "due_date": w.get("due_date"),
                    "due_time": w.get("due_time"),
                    "max_points": w.get("max_points"),
                    "work_type": w.get("work_type"),
                    "alternate_link": w.get("alternate_link"),
                    "status": status,
                    "assigned_grade": grade,
                    "late": bool(sub.get("late", False)),
                    "submitted_at": sub.get("update_time") if status in ("submitted", "graded") else None,
                })

        return enriched
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}/submissions")
async def get_course_submissions(course_id: str):
    """Fetch student submissions for a course."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        submissions = await google_classroom_service.get_student_submissions(
            credentials, course_id
        )
        return submissions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress")
async def get_learning_progress():
    """Get overall learning progress from Google Classroom."""
    user_id = "current_user"
    
    if user_id not in user_tokens:
        raise HTTPException(status_code=401, detail="Not connected to Google Classroom")
    
    try:
        credentials = google_classroom_service.get_credentials_from_token_data(
            user_tokens[user_id]
        )
        
        # Fetch courses and assignments
        courses = await google_classroom_service.get_courses(credentials)
        all_assignments = await google_classroom_service.get_all_assignments(credentials)
        
        # Calculate progress metrics
        total_courses = len(courses)
        total_assignments = len(all_assignments)
        
        # Count by state
        completed = sum(1 for a in all_assignments if a.get("state") == "TURNED_IN")
        pending = sum(1 for a in all_assignments if a.get("state") in ["CREATED", "NEW"])
        
        return {
            "total_courses": total_courses,
            "total_assignments": total_assignments,
            "completed_assignments": completed,
            "pending_assignments": pending,
            "completion_rate": (completed / total_assignments * 100) if total_assignments > 0 else 0,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
