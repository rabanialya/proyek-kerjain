import logging

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi import Depends, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from app.routers.auth import router as auth_router
from app.routers.profiles import router as profiles_router
from app.routers.worker_profile import router as worker_profile_router
from app.routers.employer_profile import router as employer_profile_router
from app.routers.category import router as category_router
from app.routers.task import router as task_router
from app.routers.application import router as application_router
from app.routers.assignment import router as assignment_router
from app.routers.work_evidence import router as work_evidence_router
from app.routers.payment import router as payment_router
from app.routers.rating import router as rating_router
from app.routers.dispute import router as dispute_router
from app.routers.report import router as report_router
from app.routers.notification import router as notification_router
from app.routers.activity_log import router as activity_log_router
from app.routers.admin import router as admin_router
from app.routers.files import router as files_router

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("422 Validation Error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# ── Static file serving DIHAPUS ────────────────────────────────────────────
# Sebelumnya: app.mount("/uploads", StaticFiles(...)) memungkinkan siapapun
# mengakses file sensitif tanpa autentikasi via URL publik.
#
# Sekarang: semua file dilayani melalui router files.py yang mewajibkan
# autentikasi dan memeriksa kepemilikan sebelum mengirim file.
#
# Direktori _private_uploads/ dan uploads/ (legacy) TIDAK di-mount sebagai
# static — tidak ada jalur publik ke file sensitif.

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust this to your frontend's origin in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(worker_profile_router)
app.include_router(work_evidence_router)
app.include_router(employer_profile_router)
app.include_router(category_router)
app.include_router(task_router)
app.include_router(application_router)
app.include_router(assignment_router)
app.include_router(payment_router)
app.include_router(rating_router)
app.include_router(dispute_router)
app.include_router(report_router)
app.include_router(notification_router)
app.include_router(activity_log_router)
app.include_router(admin_router)
app.include_router(files_router)

@app.get("/")
def root():
    return {
        "message": "API is running"
    }

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version="1.0.0",
        description=app.description,
        routes=app.routes,
    )

    schema["openapi"] = "3.0.3"

    components = schema.get("components", {}).get("schemas", {})

    for schema_item in components.values():
        properties = schema_item.get("properties", {})

        for prop in properties.values():

            # UploadFile biasa
            if prop.get("contentMediaType") == "application/octet-stream":
                prop.pop("contentMediaType", None)
                prop["type"] = "string"
                prop["format"] = "binary"

            # list[UploadFile]
            items = prop.get("items")

            if isinstance(items, dict):
                if items.get("contentMediaType") == "application/octet-stream":
                    items.pop("contentMediaType", None)
                    items["type"] = "string"
                    items["format"] = "binary"

    app.openapi_schema = schema

    return schema


app.openapi = custom_openapi