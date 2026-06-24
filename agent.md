# DeployIt Deployment Service Agent Instructions

## Rules

1. Read the current repository state before making changes.
2. Do not modify unrelated files.
3. Implement only the requested module.
4. Explain your plan before coding.
5. After implementation, explain:

   * files created
   * files modified
   * how to test the changes.
6. Keep code modular and production-ready.
7. Use TypeScript strict mode.
8. Reuse existing configurations whenever possible.
9. Never implement multiple modules unless explicitly requested.
10. Do not modify .env or package.json unless explicitly requested.

---

## Tech Stack

* Node.js
* Express
* TypeScript
* Docker
* Dockerode
* Redis
* BullMQ
* simple-git
* Winston

---

## Current Status

Completed:

* Project setup
* Express server
* Docker installation
* Redis container setup
* Redis connection

Not implemented yet:

* BullMQ
* Logger
* Environment config
* GitService
* FrameworkDetector
* DockerService
* PortService
* DeploymentWorker
* Deployment Routes
* Reverse Proxy
* SSL

---

## Folder Structure

src/
├── config/
├── routes/
├── services/
├── workers/
├── proxy/
├── docker/
├── templates/
├── scripts/
├── utils/
└── types/

---

## Development Philosophy

Implement one module at a time.

Every module should:

* compile independently
* have clear responsibilities
* be easy to test
* avoid unnecessary dependencies.
