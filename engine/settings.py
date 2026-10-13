import os

from dotenv import load_dotenv

load_dotenv()

KEY_NAMES = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "TICKETMASTER_API_KEY"]

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY")

DAYS_AHEAD = 14 # Look for events in the next 14 days
MAX_WALK_METERS = 1000 # Max dist from a T stop to an event 
WALK_METERS_PER_MINUTE = 80 # Average walking speed in meters per minute

def check():
    # Make sure all keys are set
    for key in KEY_NAMES:
        if os.getenv(key):
            status = "Set"
        else:
            status = "Missing"
        print(f"{key}: {status}")

if __name__ == "__main__":
    check()
            
