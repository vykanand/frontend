# Resume Matcher using BERT, FAISS and Flask with React Frontend

## Overview

This repository contains a Docker Compose setup for our app, which allows you to easily run the application along with its dependencies.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine

## Getting Started

Follow these steps to get your application up and running using Docker Compose.

### 1. Clone the Repository

First, clone this repository to your local machine:

```bash
git clone https://github.com/vykanand/resume-matcher.git
cd resume-matcher
```
### 2. Run the application

Now run the application using this command:
```
docker compose up
```
You can access the application using http://localhost:3000

Please upload some JD in the folder resume-store to convert and store them in our FAISS Db and then search get best matching resumes to your JD.

### New Update: Unit tests for both frontend and backend have been added to the project.