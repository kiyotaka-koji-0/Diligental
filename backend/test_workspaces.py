import asyncio
from httpx import AsyncClient

BASE_URL = "http://localhost:8005"

async def test_workspace_flow():
    async with AsyncClient(base_url=BASE_URL) as client:
        # 1. Login
        response = await client.post("/auth/token", data={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully.")

        # 2. Create Workspace
        ws_name = "Test Workspace"
        response = await client.post("/workspaces/", json={"name": ws_name}, headers=headers)
        if response.status_code != 200:
            print(f"Create Workspace failed: {response.text}")
            return
        
        workspace = response.json()
        print(f"Created Workspace: {workspace['name']} (ID: {workspace['id']})")

        # 3. Get My Workspaces
        response = await client.get("/workspaces/", headers=headers)
        workspaces = response.json()
        print(f"My Workspaces: {[w['name'] for w in workspaces]}")
        
        # 4. Get Specific Workspace
        ws_id = workspace['id']
        response = await client.get(f"/workspaces/{ws_id}", headers=headers)
        if response.status_code == 200:
            print(f"Fetched details for workspace: {response.json()['name']}")
        else:
             print(f"Fetch failed: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_workspace_flow())
