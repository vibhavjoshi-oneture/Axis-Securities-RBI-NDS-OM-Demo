# NDS OMS Wrapper

## Overview

This project acts as a wrapper layer for integrating with the NDS-OM FIX Gateway.

### Available APIs

- **New Order** - Create a new order
- **Modify Order** - Modify an existing order
- **Cancel Order** - Cancel an order

---

## Setup and Run

### Prerequisites

- Go 1.18 or higher

### 1. Install Go

Download and install Go from the official website:

**[https://go.dev/doc/install](https://go.dev/doc/install)**

Follow the installation instructions for your operating system.

---

### 2. Verify Go Installation

Check that Go is installed correctly by running:

```bash
go version
```

---

### 3. Run the Application

Navigate to the project root directory (where `main.go` is located) and run:

```bash
go run main.go
```

The server will start on **port 8082**.

You should see output indicating the server is running:


---

## API Documentation

### Testing with Postman

In Postman each request contains example payloads and expected responses.
All API endpoints will be available with pre-configured examples

### Base URL