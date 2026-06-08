import requests
import sys

BASE_URL = "http://127.0.0.1:8001/api/v1"

def test_flow():
    print("🚀 Starting Automated API Integration Tests...")
    
    # 1. Clean test variables
    user_email = "testuser@example.com"
    user_password = "password123"
    user_name = "Jane Doe"
    
    admin_email = "admin@example.com"
    admin_password = "admin123"
    
    # 2. Register a new user
    print("\n[Test 1] Registering a standard user...")
    reg_payload = {
        "email": user_email,
        "password": user_password,
        "full_name": user_name,
        "role": "user"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    if r.status_code == 201:
        print("✅ User registered successfully.")
    elif r.status_code == 400 and "already exists" in r.text:
        print("ℹ️ User already registered, continuing...")
    else:
        print(f"❌ Failed User registration: Status {r.status_code}, Body: {r.text}")
        sys.exit(1)

    # 3. Test duplicate email registration protection
    print("\n[Test 2] Verifying duplicate registration protection...")
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    print("✅ Duplicate registration blocked correctly.")

    # 4. Login as standard user
    print("\n[Test 3] Logging in as standard user...")
    login_payload = {"email": user_email, "password": user_password}
    r = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert r.status_code == 200, f"Failed login: {r.text}"
    user_token = r.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("✅ Login successful. JWT token acquired.")

    # 5. Fetch profile details
    print("\n[Test 4] Fetching user profile details (/me)...")
    r = requests.get(f"{BASE_URL}/auth/me", headers=user_headers)
    assert r.status_code == 200, f"Failed fetch profile: {r.text}"
    user_data = r.json()
    assert user_data["email"] == user_email
    assert user_data["role"] == "user"
    user_id = user_data["id"]
    print(f"✅ Profile verified. ID: {user_id}, Role: {user_data['role']}")

    # 6. Verify User cannot access admin endpoints
    print("\n[Test 5] Checking RBAC boundaries (User access to Admin endpoints)...")
    r = requests.get(f"{BASE_URL}/admin/stats", headers=user_headers)
    assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}"
    print("✅ Standard user blocked from admin stats correctly.")

    # 7. Create a Task
    print("\n[Test 6] Creating a new task...")
    task_payload = {
        "title": "API Test Task",
        "description": "Verify task creation endpoints",
        "status": "pending"
    }
    r = requests.post(f"{BASE_URL}/tasks/", json=task_payload, headers=user_headers)
    assert r.status_code == 201, f"Failed task creation: {r.text}"
    task = r.json()
    task_id = task["id"]
    print(f"✅ Task created successfully. Task ID: {task_id}")

    # 8. List Tasks
    print("\n[Test 7] Listing tasks...")
    r = requests.get(f"{BASE_URL}/tasks/", headers=user_headers)
    assert r.status_code == 200
    tasks = r.json()
    assert len(tasks) >= 1, "Expected at least 1 task in roster"
    assert any(t["id"] == task_id for t in tasks), "Created task not found in list"
    print("✅ Task successfully retrieved in task list.")

    # 9. Update Task status
    print("\n[Test 8] Updating task status to 'in_progress'...")
    update_payload = {"status": "in_progress"}
    r = requests.put(f"{BASE_URL}/tasks/{task_id}", json=update_payload, headers=user_headers)
    assert r.status_code == 200
    updated_task = r.json()
    assert updated_task["status"] == "in_progress"
    print("✅ Task status updated successfully.")

    # 10. Login as Admin
    print("\n[Test 9] Logging in as Admin...")
    admin_login = {"email": admin_email, "password": admin_password}
    r = requests.post(f"{BASE_URL}/auth/login", json=admin_login)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Admin login successful.")

    # 11. Fetch Admin stats
    print("\n[Test 10] Fetching system metrics as Admin...")
    r = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    stats = r.json()
    assert "total_users" in stats
    assert "total_tasks" in stats
    print(f"✅ System stats retrieved: Total Users={stats['total_users']}, Total Tasks={stats['total_tasks']}")

    # 12. Retrieve Admin task listing (View All Users' Tasks)
    print("\n[Test 11] Retrieving all tasks as Admin...")
    r = requests.get(f"{BASE_URL}/tasks/?all_users=true", headers=admin_headers)
    assert r.status_code == 200
    all_tasks = r.json()
    assert any(t["id"] == task_id for t in all_tasks), "Standard user's task not visible to Admin"
    print("✅ Admin verified to retrieve tasks globally.")

    # 13. Admin role elevation
    print("\n[Test 12] Elevating standard user to Admin role...")
    r = requests.put(f"{BASE_URL}/admin/users/{user_id}/role?role=admin", headers=admin_headers)
    assert r.status_code == 200
    elevated_user = r.json()
    assert elevated_user["role"] == "admin"
    print("✅ User promoted to Admin successfully.")

    # 14. Verify elevated user can access Admin stats
    print("\n[Test 13] Verifying promoted user can access admin stats...")
    r = requests.get(f"{BASE_URL}/admin/stats", headers=user_headers)
    assert r.status_code == 200, f"Expected 200 OK after promotion, got {r.status_code}"
    print("✅ Promoted user successfully accessed Admin stats endpoint.")

    # 15. Clean up / Demote and delete task
    print("\n[Test 14] Reverting user privileges & cleaning up task...")
    # Demote back
    r = requests.put(f"{BASE_URL}/admin/users/{user_id}/role?role=user", headers=admin_headers)
    assert r.status_code == 200
    
    # Delete task
    r = requests.delete(f"{BASE_URL}/tasks/{task_id}", headers=user_headers)
    assert r.status_code == 200
    print("✅ Cleanup complete: task deleted & user demoted.")

    print("\n🎉 ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! 100% CORRECT.")

if __name__ == "__main__":
    test_flow()
