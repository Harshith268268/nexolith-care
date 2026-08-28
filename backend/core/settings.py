import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file using absolute path base directory
load_dotenv(BASE_DIR / '.env', override=True)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True") == "True"

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-nexolith-care-local-dev-key-2026')

# Restrict hosts in production safely (default to wildcard for deployment flexibility)
ALLOWED_HOSTS = ['*'] if DEBUG else [h.strip() for h in os.getenv("ALLOWED_HOSTS", ".onrender.com,.railway.app,.render.com,localhost,127.0.0.1,*").split(",") if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Local apps
    'accounts',
    'family',
    'reports',
    'alerts',
    'analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database Configuration (PostgreSQL Required for Local & Production)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip().strip("'").strip('"')

if not DATABASE_URL and os.environ.get('DB_NAME'):
    db_user = os.environ.get('DB_USER', 'postgres')
    db_pass = os.environ.get('DB_PASSWORD', '')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME')
    DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

if not DATABASE_URL:
    raise ImproperlyConfigured(
        "DATABASE_URL environment variable is missing. "
        "Nexolith Care requires PostgreSQL for both local development and production. "
        "SQLite is disabled. Please set DATABASE_URL in your .env file e.g.: "
        "DATABASE_URL=postgresql://postgres:password@localhost:5432/nexolith_care"
    )

try:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True
        )
    }
except Exception:
    import urllib.parse
    try:
        scheme, rest = DATABASE_URL.split("://", 1)
        if "@" in rest:
            user_pass, host_part = rest.rsplit("@", 1)
            if ":" in user_pass:
                user, password = user_pass.split(":", 1)
                encoded_pass = urllib.parse.quote_plus(urllib.parse.unquote(password))
                DATABASE_URL = f"{scheme}://{user}:{encoded_pass}@{host_part}"
        DATABASES = {
            'default': dj_database_url.parse(
                DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True
            )
        }
    except Exception as fallback_err:
        raise ImproperlyConfigured(f"Invalid DATABASE_URL format: {fallback_err}")

if 'sqlite3' in DATABASES['default'].get('ENGINE', ''):
    raise ImproperlyConfigured(
        "SQLite engine is not permitted. Nexolith Care requires PostgreSQL for both local and production."
    )

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []

# Configurable Default File Storage (Local FileSystem or Cloud Object Storage like S3 / Cloudinary)
DEFAULT_FILE_STORAGE = os.getenv(
    "DEFAULT_FILE_STORAGE",
    "django.core.files.storage.FileSystemStorage"
)

STORAGES = {
    "default": {
        "BACKEND": DEFAULT_FILE_STORAGE,
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# AWS S3 / Cloud Object Storage Configuration (populates automatically when env vars are present)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN", "")

# Media files (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Dynamic Cross-Platform Tesseract OCR binary path
import shutil
system_tesseract = shutil.which("tesseract")
if system_tesseract:
    TESSERACT_CMD = system_tesseract
elif os.environ.get('TESSERACT_CMD'):
    TESSERACT_CMD = os.environ.get('TESSERACT_CMD')
elif os.path.exists('/usr/bin/tesseract'):
    TESSERACT_CMD = '/usr/bin/tesseract'
else:
    TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Security headers for production SSL proxy environments
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# CORS Config
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "https://*.vercel.app,http://localhost:5173").split(",")
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins if origin.strip() and not origin.strip().startswith('https://*.')]
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://.*\.vercel\.app$",
        r"^https://.*\.railway\.app$",
        r"^https://.*\.render\.com$",
    ]

# CSRF Trusted Origins
csrf_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "https://*.railway.app,https://*.vercel.app,http://localhost:5173").split(",")
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_origins if origin.strip() and not origin.strip().startswith('https://*.')]


# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'djangorestframework_camel_case.render.CamelCaseJSONRenderer',
        'djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'djangorestframework_camel_case.parser.CamelCaseJSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'core.views.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Email Configuration
email_backend_env = os.getenv('EMAIL_BACKEND')
if email_backend_env:
    EMAIL_BACKEND = email_backend_env
elif os.getenv('EMAIL_HOST_USER') and os.getenv('EMAIL_HOST_PASSWORD'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 't')

default_from = os.getenv('DEFAULT_FROM_EMAIL')
if default_from:
    DEFAULT_FROM_EMAIL = default_from
elif EMAIL_HOST_USER:
    DEFAULT_FROM_EMAIL = f"Nexolith Care <{EMAIL_HOST_USER}>"
else:
    DEFAULT_FROM_EMAIL = 'Nexolith Care <noreply@nexolithcare.com>'

