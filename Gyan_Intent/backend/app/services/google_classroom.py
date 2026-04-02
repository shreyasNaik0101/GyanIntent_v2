"""Google Classroom API integration."""

from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    Request = None  # type: ignore
    Credentials = None  # type: ignore
    Flow = None  # type: ignore
    build = None  # type: ignore
    HttpError = Exception  # type: ignore

from app.config import settings

# Google OAuth2 configuration - use settings which loads from .env
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]


class GoogleClassroomService:
    """Service for interacting with Google Classroom API."""
    
    def __init__(self):
        self.client_id = GOOGLE_CLIENT_ID
        self.client_secret = GOOGLE_CLIENT_SECRET
        self.redirect_uri = GOOGLE_REDIRECT_URI
        self._pending_flows: Dict[str, Any] = {}  # state -> Flow (for PKCE)
        
    def _make_flow(self):
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = self.redirect_uri
        return flow

    def get_auth_url(self, state: str = None) -> str:
        """Generate Google OAuth2 authorization URL."""
        flow = self._make_flow()
        
        auth_url, returned_state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=state or "",
            prompt="consent",
        )
        # Store flow so the same PKCE code_verifier is used in exchange_code
        self._pending_flows[state or returned_state] = flow
        return auth_url
    
    def exchange_code(self, code: str, state: str = None) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        # Reuse the flow from get_auth_url so PKCE code_verifier matches
        flow = self._pending_flows.pop(state, None) if state else None
        if flow is None:
            flow = self._make_flow()
        
        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            return {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
            }
        except Exception as e:
            raise Exception(f"Failed to exchange code: {str(e)}")
    
    def get_credentials_from_token_data(self, token_data: Dict[str, Any]) -> Credentials:
        """Create Credentials object from stored token data."""
        return Credentials(
            token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=token_data.get("client_id", self.client_id),
            client_secret=token_data.get("client_secret", self.client_secret),
            scopes=token_data.get("scopes", SCOPES),
        )
    
    async def get_courses(self, credentials: Credentials) -> List[Dict[str, Any]]:
        """Fetch all courses for the authenticated user."""
        try:
            service = build("classroom", "v1", credentials=credentials)
            courses = []
            page_token = None
            
            while True:
                request = service.courses().list(
                    pageToken=page_token,
                    pageSize=100,
                    courseStates=["ACTIVE"],
                )
                response = request.execute()
                
                for course in response.get("courses", []):
                    courses.append({
                        "id": course.get("id"),
                        "name": course.get("name"),
                        "section": course.get("section"),
                        "description": course.get("description"),
                        "description_heading": course.get("descriptionHeading"),
                        "room": course.get("room"),
                        "owner_id": course.get("ownerId"),
                        "creation_time": course.get("creationTime"),
                        "update_time": course.get("updateTime"),
                        "enrollment_code": course.get("enrollmentCode"),
                        "course_state": course.get("courseState"),
                        "alternate_link": course.get("alternateLink"),
                        "teacher_group_email": course.get("teacherGroupEmail"),
                        "course_group_email": course.get("courseGroupEmail"),
                        "teacher_folder": course.get("teacherFolder"),
                        "guardians_enabled": course.get("guardiansEnabled"),
                        "calendar_id": course.get("calendarId"),
                    })
                
                page_token = response.get("nextPageToken")
                if not page_token:
                    break
            
            return courses
            
        except HttpError as e:
            raise Exception(f"Failed to fetch courses: {str(e)}")
    
    async def get_course_work(self, credentials: Credentials, course_id: str) -> List[Dict[str, Any]]:
        """Fetch coursework/assignments for a specific course."""
        try:
            service = build("classroom", "v1", credentials=credentials)
            coursework = []
            page_token = None
            
            while True:
                request = service.courses().courseWork().list(
                    courseId=course_id,
                    pageToken=page_token,
                    pageSize=100,
                )
                response = request.execute()
                
                for work in response.get("courseWork", []):
                    coursework.append({
                        "id": work.get("id"),
                        "course_id": work.get("courseId"),
                        "title": work.get("title"),
                        "description": work.get("description"),
                        "state": work.get("state"),
                        "alternate_link": work.get("alternateLink"),
                        "creation_time": work.get("creationTime"),
                        "update_time": work.get("updateTime"),
                        "due_date": work.get("dueDate"),
                        "due_time": work.get("dueTime"),
                        "max_points": work.get("maxPoints"),
                        "work_type": work.get("workType"),
                        "assignee_mode": work.get("assigneeMode"),
                    })
                
                page_token = response.get("nextPageToken")
                if not page_token:
                    break
            
            return coursework
            
        except HttpError as e:
            raise Exception(f"Failed to fetch coursework: {str(e)}")
    
    async def get_student_submissions(
        self, 
        credentials: Credentials, 
        course_id: str, 
        coursework_id: str = "-"
    ) -> List[Dict[str, Any]]:
        """Fetch student submissions for coursework."""
        try:
            service = build("classroom", "v1", credentials=credentials)
            submissions = []
            page_token = None
            
            while True:
                request = service.courses().courseWork().studentSubmissions().list(
                    courseId=course_id,
                    courseWorkId=coursework_id,
                    pageToken=page_token,
                    pageSize=100,
                )
                response = request.execute()
                
                for submission in response.get("studentSubmissions", []):
                    submissions.append({
                        "id": submission.get("id"),
                        "course_id": submission.get("courseId"),
                        "course_work_id": submission.get("courseWorkId"),
                        "user_id": submission.get("userId"),
                        "creation_time": submission.get("creationTime"),
                        "update_time": submission.get("updateTime"),
                        "state": submission.get("state"),
                        "late": submission.get("late"),
                        "draft_grade": submission.get("draftGrade"),
                        "assigned_grade": submission.get("assignedGrade"),
                        "alternate_link": submission.get("alternateLink"),
                    })
                
                page_token = response.get("nextPageToken")
                if not page_token:
                    break
            
            return submissions
            
        except HttpError as e:
            raise Exception(f"Failed to fetch submissions: {str(e)}")
    
    async def get_all_assignments(self, credentials: Credentials) -> List[Dict[str, Any]]:
        """Fetch all assignments across all courses."""
        courses = await self.get_courses(credentials)
        all_assignments = []
        
        for course in courses:
            coursework = await self.get_course_work(credentials, course["id"])
            for work in coursework:
                work["course_name"] = course["name"]
                all_assignments.append(work)
        
        return all_assignments
    
    async def get_user_profile(self, credentials: Credentials) -> Dict[str, Any]:
        """Get the authenticated user's profile."""
        try:
            service = build("classroom", "v1", credentials=credentials)
            profile = service.userProfiles().get(userId="me").execute()
            
            return {
                "id": profile.get("id"),
                "name": profile.get("name", {}).get("fullName"),
                "email": profile.get("emailAddress"),
                "photo_url": profile.get("photoUrl"),
                "permissions": profile.get("permissions", []),
            }
            
        except HttpError as e:
            raise Exception(f"Failed to fetch user profile: {str(e)}")


# Singleton instance
google_classroom_service = GoogleClassroomService()
