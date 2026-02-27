# classroom-mcp

MCP (Model Context Protocol) server for Google Classroom API integration.

## Features

- Create and manage Google Classroom courses
- Create assignments with materials (links, files, etc.)
- Manage students and roster
- Post announcements
- Retrieve course information and assignments

## Setup

### Prerequisites

1. **Google Cloud Project** with Classroom API enabled
2. **OAuth 2.0 credentials** (Desktop app or Service Account)
3. **Node.js 18+**

### Installation

```bash
npm install
```

### Authentication

#### Option 1: OAuth 2.0 (Desktop)

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Download credentials JSON
3. Save as `credentials.json` in this directory
4. First run will open browser for authorization
5. Token saved to `token.json`

#### Option 2: Service Account

1. Create service account in Google Cloud Console
2. Enable domain-wide delegation
3. Download service account key JSON
4. Save as `service-account.json`
5. Add service account email to Google Workspace admin (with Classroom scopes)

### Configuration

Create `.env`:

```env
# OAuth 2.0
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_TOKEN_PATH=./token.json

# Service Account
# GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
# GOOGLE_ADMIN_EMAIL=admin@yourdomain.com

# MCP Server
MCP_PORT=9325
```

## Usage

### Run MCP Server

```bash
npm start
```

### Connect from Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "classroom": {
      "command": "npx",
      "args": ["classroom-mcp-server"],
      "cwd": "/path/to/classroom-mcp",
      "env": {}
    }
  }
}
```

## MCP Tools

### `classroom_create_course`
Create a new Google Classroom course.

**Parameters:**
- `name` (required): Course name
- `section`: Section name (e.g., "Period 1", "Summer 2026")
- `description`: Course description
- `room`: Room number/location

**Example:**
```json
{
  "name": "AIN 2001 — Artificial Intelligence",
  "section": "Summer 2026",
  "description": "Survey of AI following Russell & Norvig's AIMA (4th ed.)"
}
```

### `classroom_create_assignment`
Create an assignment (coursework).

**Parameters:**
- `courseId` (required): Course ID
- `title` (required): Assignment title
- `description`: Assignment description (supports Markdown/HTML)
- `dueDate`: Due date (ISO 8601: "2026-06-15")
- `dueTime`: Due time (24h: "23:59")
- `maxPoints`: Maximum points
- `materials`: Array of materials (links, docs, etc.)

**Example:**
```json
{
  "courseId": "123456789",
  "title": "Lecture 1: Introduction",
  "description": "Complete exercises in GitHub repo...",
  "dueDate": "2026-06-01",
  "dueTime": "23:59",
  "maxPoints": 10,
  "materials": [
    {
      "type": "link",
      "url": "https://classroom.github.com/a/AbCdEfGh",
      "title": "Accept GitHub Assignment"
    }
  ]
}
```

### `classroom_list_courses`
List all courses.

### `classroom_get_course`
Get course details.

**Parameters:**
- `courseId` (required): Course ID

### `classroom_list_assignments`
List assignments for a course.

**Parameters:**
- `courseId` (required): Course ID

### `classroom_add_student`
Invite/add student to course.

**Parameters:**
- `courseId` (required): Course ID
- `email` (required): Student email

### `classroom_post_announcement`
Post an announcement to the course stream.

**Parameters:**
- `courseId` (required): Course ID
- `text` (required): Announcement text

## Google Classroom API Setup

### 1. Enable Classroom API

```bash
gcloud services enable classroom.googleapis.com
```

### 2. Create OAuth Credentials

```bash
gcloud auth application-default login
```

Or create OAuth client in Cloud Console:
1. APIs & Services → Credentials → Create Credentials → OAuth client ID
2. Application type: Desktop app
3. Download JSON → save as `credentials.json`

### 3. Scopes Required

- `https://www.googleapis.com/auth/classroom.courses`
- `https://www.googleapis.com/auth/classroom.coursework.students`
- `https://www.googleapis.com/auth/classroom.announcements`
- `https://www.googleapis.com/auth/classroom.rosters`

## Integration with samwise-aima

This MCP server can be used alongside the GitHub Classroom workflow:

1. **Create course in Google Classroom** via MCP tools
2. **Create assignments in Google Classroom** with links to GitHub Classroom invitations
3. **Sync roster** between Google Classroom and GitHub Classroom
4. **Post announcements** (e.g., "New lecture slides posted")

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

## License

MIT
