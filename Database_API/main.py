# Import required modules
import dotenv
import os
import mysql.connector
from mysql.connector import errorcode
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
import jwt
import requests
from requests.auth import HTTPBasicAuth
from twilio.rest import Client
import random


# Load environment variables
dotenv.load_dotenv()

# Initialize the FastAPI app
app = FastAPI()

# Define allowed origins for CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to the MySQL database
try:
    cnx = mysql.connector.connect(
        user=os.getenv('MYSQL_USER'),  # Replace with your username
        password=os.getenv('MYSQL_PASSWORD'),  # Replace with your password
        host=os.getenv('MYSQL_HOST'),  # Replace with your host
        database=os.getenv('MYSQL_DB'),  # Replace with your database name
    )
    print(os.getenv('MYSQL_USER'))
    print(os.getenv('MYSQL_PASSWORD'))
    print(os.getenv('MYSQL_HOST'),)
    print(os.getenv('MYSQL_DB'))
    cursor = cnx.cursor(dictionary=True)  # Use dictionary cursor for easy access to column names
except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Invalid database credentials")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
    else:
        print(f"Database connection error: {err}")
    # Ensure the application does not proceed without a valid connection
    cnx = None
    cursor = None

@app.post("/set-password")
async def set_password(phone_number: str, password: str,wallet_address: str):
    try:
        # Check if the user exists
        cursor.execute("SELECT voter_id FROM voters WHERE phone_number = %s", (phone_number,))
        result = cursor.fetchone()
        voter_id = f"VOTER{random.randint(1000, 9999)}"  # Generate a unique Voter ID
        if result:
            # Update the password for existing user
            cursor.execute(
                "UPDATE voters SET password = %s,address = %s,voter_id=%s WHERE phone_number = %s",
                (password, wallet_address, voter_id, phone_number)
            )
            message = "Password updated successfully. You can now log in."
        else:
            # Insert a new user record
            cursor.execute(
                "INSERT INTO voters (voter_id, phone_number, password, role, address) VALUES (%s, %s, %s, %s, %s)",
                (voter_id, phone_number, password, "user",wallet_address)
            )
            message = f"Account created successfully. You can now log in now with voterID : {voter_id}."

        # Commit changes to the database
        cnx.commit()

        return {"message": message,"voter_id":voter_id}
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Endpoint for login
@app.get("/login")
async def login(voter_id: str, password: str):
    try:
        # Validate credentials
        cursor.execute(
            "SELECT voter_id, role, address FROM voters WHERE voter_id = %s AND password = %s",
            (voter_id, password)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter ID or password"
            )
        # Generate a simple token (JWT)
        token = jwt.encode({'voter_id': user['voter_id'], 'role': user['role'], 'address': user['address']}, os.environ['SECRET_KEY'], algorithm='HS256')
        return {'token': token, 'role': user['role']}
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Twilio API Configuration
ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
AUTH_TOKEN = os.environ['TWILIO_AUTH_TOKEN']
VERIFY_SERVICE_SID = os.environ['TWILIO_VERIFY_SERVICE_SID']

# Initialize Twilio client
client = Client(ACCOUNT_SID, AUTH_TOKEN)

# Endpoint for sending OTP
@app.post("/send-otp")
async def send_otp(phone_number: str):
    try:
        # Send OTP using Twilio Verify Service
        verification = client.verify \
            .services(VERIFY_SERVICE_SID) \
            .verifications \
            .create(to="+91"+phone_number, channel='sms')
        if verification.status == 'pending':
            return {"message": "OTP sent successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Endpoint for verifying OTP
@app.post("/verify-otp")
async def verify_otp(phone_number: str, code: str):
    try:
        # Verify OTP using Twilio Verify Service
        verification_check = client.verify \
            .services(VERIFY_SERVICE_SID) \
            .verification_checks \
            .create(to="+91"+phone_number, code=code)
        if verification_check.status == 'approved':
            return {"message": "OTP verified successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        return {"message": "OTP verified successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/validate-wallet")
async def validate_wallet(voter_id: str, connected_wallet: str):
    try:
        # Query the database for the voter's address
        cursor.execute(
            "SELECT address FROM voters WHERE voter_id = %s",
            (voter_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voter not found"
            )
        
        # Check if the address matches the connected wallet
        if result['address'] == connected_wallet:
            return {"valid": True, "message": "Wallet address matches"}
        else:
            return {"valid": False, "message": "Wallet address does not match"}
    
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
