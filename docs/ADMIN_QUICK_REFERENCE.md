# Admin User Management - Quick Reference Guide

## Access Admin Panel

1. **Login with Admin Account**
   - Go to `/login`
   - Enter admin username and password
   - Click "Login"

2. **Navigate to Admin**
   - Click "Admin" or go directly to `http://localhost:3000/admin/users`
   - You'll see the User Management dashboard

## Using the Admin Panel

### View All Users
- The user table displays all system users
- Shows: Username, Email, Role, IP Address, Join Date
- Color-coded roles: Purple = Admin, Green = User

### Add New User
1. Click **"Add User"** button (top right)
2. Fill in the form:
   - **Email**: Must be a valid email address
   - **Username**: Must be at least 3 characters (must be unique)
   - **Password**: Must be at least 6 characters
   - **Full Name**: Optional
   - **Tailnet IP**: Optional (e.g., 100.x.x.x)
   - **Role**: Select "User" or "Admin"
3. Click **"Create User"** to save
4. Success notification will appear at top right

### Edit User
1. Find the user in the table
2. Click **"Edit"** button in the Actions column
3. Modal will open with current user details
4. Modify fields as needed:
   - Leave password blank to keep current password
   - Email must be unique
   - Username must be unique
5. Click **"Update User"** to save
6. Success notification will appear

### Delete User
1. Find the user in the table
2. Click **"Delete"** button in the Actions column
3. Delete button changes to show **"Confirm"** and **"Cancel"**
4. Click **"Confirm"** to permanently delete the user
5. Success notification will appear

**⚠️ Note:** You cannot delete your own admin account

## Statistics Cards

At the top of the page, see:
- **Total Users**: Total number of users in system
- **Admins**: Number of admin users
- **Regular Users**: Number of regular users

These update automatically after any user action.

## Notifications

**Success Notification (Green)**
- Appears when user is created/updated/deleted
- Automatically dismisses after 4 seconds
- Shows checkmark icon

**Error Notification (Red)**
- Appears if operation fails
- Shows error message from server
- Automatically dismisses after 4 seconds
- Shows alert icon

## Form Validation

The form validates the following:

| Field | Validation |
|-------|-----------|
| Email | Must be valid email format |
| Username | Min 3 characters, must be unique |
| Password | Min 6 characters, required for new users |
| Role | Must be "user" or "admin" |

If validation fails, error message appears below the field in red text.

## API Endpoints (Backend)

### List Users
```
GET /users/
Authorization: Bearer <token>
Response: Array of user objects
```

### Create User
```
POST /users/
Authorization: Bearer <token>
Body: {
    email: "user@example.com",
    username: "username",
    password: "password",
    full_name: "Full Name",
    role: "user",
    tailnet_ip: "100.x.x.x"
}
Response: Created user object
```

### Update User
```
PUT /users/{user_id}
Authorization: Bearer <token>
Body: {
    email: "newemail@example.com",  // Optional
    username: "newusername",        // Optional
    password: "newpassword",        // Optional
    full_name: "New Name",          // Optional
    role: "admin",                  // Optional
    tailnet_ip: "100.x.x.x"         // Optional
}
Response: Updated user object
```

### Delete User
```
DELETE /users/{user_id}
Authorization: Bearer <token>
Response: { message: "User deleted successfully" }
```

## Security Notes

✅ **Only admins can:**
- View all users
- Create new users
- Edit any user
- Delete any users

✅ **Users cannot:**
- Delete their own account
- Edit other users
- Create new users
- View other users

✅ **Passwords are:**
- Hashed before storage (bcrypt)
- Required when creating users
- Optional when editing (leave blank to keep existing)

## Troubleshooting

**Q: I can't access the admin panel**
A: Make sure you're logged in with an admin account. Non-admin users are redirected to the main app.

**Q: Error "Username already registered"**
A: Try a different username. Usernames must be unique across the system.

**Q: Error "User not found"**
A: The user may have been deleted. Refresh the page to see current users.

**Q: Can't create user with error**
A: Check all required fields are filled correctly:
   - Email must be valid format
   - Username min 3 characters
   - Password min 6 characters

**Q: Can't edit user password**
A: Password field is optional when editing. Leave it blank to keep the current password, or enter a new password (min 6 characters).

## User Roles

### Admin Role
- Can access admin panel
- Can create, edit, delete users
- Can assign roles to other users
- Full system access

### User Role
- Cannot access admin panel
- Can participate in workspaces and channels
- Can send messages
- Limited to their own data

---

For more detailed information, see `ADMIN_USER_MANAGEMENT_IMPLEMENTATION.md`
