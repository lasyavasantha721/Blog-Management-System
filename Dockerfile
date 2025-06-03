# Use the official Python runtime as a parent image
FROM python:3.11.3

# Set the working directory to /app
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt /app
# Install any needed packages specified in requirements.txt
RUN pip install --trusted-host pypi.python.org -r requirements.txt

# Copy the rest of the application code into the container at /app
COPY . /app

# Expose port 80 for the FastAPI app to listen on
EXPOSE 8000

# Define the command to run your FastAPI application when the container starts
CMD ["uvicorn", "main:app", "--reload" ,"--host", "0.0.0.0", "--port", "8000"]