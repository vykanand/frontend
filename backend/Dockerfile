# /backend/Dockerfile
FROM python:3.10

# Set the working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Run tests
RUN pytest

# Copy the rest of the app
COPY . .

# Expose the port for Flask
EXPOSE 5000

# Start the Flask app
CMD ["python", "server.py"]
