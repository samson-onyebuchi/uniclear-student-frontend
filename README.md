# UniClear Student Clearance System — Frontend

UniClear is a web-based student clearance interface designed to help students and university clearance staff interact with the clearance process through a centralized portal.

This repository contains **only the frontend** of the UniClear Student Clearance System. The backend API and database are maintained separately.

## Features

### Student Interface
- Student registration and login.
- Forgot-password and password-reset interfaces.
- Student clearance creation and status tracking.
- Document upload and document viewing.
- Clearance-stage progress information.
- Display of document review status and rejection information.

### Staff Interface
- Staff login and password management.
- Role-based clearance dashboard.
- View students assigned to the staff member's clearance stage.
- Search and filter student clearance records.
- View student details and clearance progress.
- Verify clearance-stage OTPs.
- Approve or reject documents with a rejection reason.
- Review clearance records and their statuses.

### Clearance Stages

The clearance workflow contains seven stages:

1. Finance
2. Department
3. Faculty
4. Library
5. Health
6. Student Affairs
7. Final Clearance

The frontend displays information and provides actions according to the clearance workflow supported by the backend API.

## Technology Stack

- **HTML5** — page structure.
- **CSS3** — layout, styling, and responsive design.
- **JavaScript** — interface behavior and API communication.
- **REST API** — communication with the separately deployed backend.

## Project Structure

The frontend files are organized as follows:

```text
Frontend/
│
├── README.md
├── index.html
├── login.html
├── register.html
├── staff-dashboard.html
├── student-details.html
├── current-stage-students.html
│
├── css/
│   ├── student-dashboard.css
│   ├── staff-dashboard.css
│   ├── student-details.css
│   └── current-stage-students.css
│
└── js/
    ├── student-dashboard.js
    ├── staff-dashboard.js
    ├── student-details.js
    └── current-stage-students.js
```

*Note: The structure above illustrates the main files. Keep the actual filenames in your repository if they differ from this example.*

## Requirements

To run the frontend locally, you need:

- A modern web browser, such as Google Chrome.
- Visual Studio Code or another code editor.
- The Live Server extension for Visual Studio Code.
- Access to the UniClear backend API.

## Running the Frontend Locally

1. Clone or download this repository.
2. Open the `Frontend` folder in Visual Studio Code.
3. Install the **Live Server** extension if it is not already installed.
4. Open the required HTML page.
5. Right-click the HTML file and select **Open with Live Server**.
6. Test the interface in your browser.

Use the appropriate entry page for the interface you want to access, such as the student login or staff login page.

## Backend API Configuration

The frontend communicates with the separately deployed UniClear backend.

Current backend base URL:

```text
https://uniclear-student-platform.vercel.app
```

Frontend JavaScript files that make API requests must use the correct backend base URL and API endpoint paths.

For local backend development, the base URL may instead be:

```text
http://127.0.0.1:5000
```

Change the API base URL in the relevant JavaScript configuration when switching between the deployed backend and a local backend.

**Important:** The frontend repository does not contain the Flask application, backend routes, MongoDB database, or document storage implementation.

## Clearance Workflow

The frontend supports the following general process:

1. Students access the portal and submit their clearance information and required documents.
2. Staff access the dashboard for their assigned clearance stage.
3. Staff review student records and submitted documents.
4. Staff approve documents or reject them with a reason.
5. The clearance process proceeds through the configured stages.
6. The final clearance stage records completion when the backend confirms successful final approval.

Actual clearance status, document storage, OTP verification, and approval processing depend on the backend API.

## Deployment

This repository is intended for deployment as a frontend-only project.

It can be hosted on a static web hosting service, provided that:

- The correct frontend entry page is configured.
- All HTML, CSS, and JavaScript file paths are correct.
- The deployed frontend can communicate with the backend API.
- The backend allows requests from the frontend's deployed origin through its CORS configuration.

The backend must be deployed and operational separately for features that require server-side processing.

## Repository Scope

This repository contains only the frontend interface:

- HTML pages
- CSS stylesheets
- JavaScript files
- Frontend documentation

It does not contain the backend source code or database.

## Development Notes

- Keep HTML files directly inside the `Frontend` folder.
- Keep CSS files inside the `css` folder.
- Keep JavaScript files inside the `js` folder.
- Use relative paths for local CSS and JavaScript files.
- Keep API endpoints consistent with the deployed backend.
- Do not commit passwords, secret keys, private credentials, or environment-specific secrets to the repository.

## Project

**Name:** UniClear Student Clearance System — Frontend  
**Repository:** `uniclear-student-frontend`  
**Backend API:** `https://uniclear-student-platform.vercel.app`

