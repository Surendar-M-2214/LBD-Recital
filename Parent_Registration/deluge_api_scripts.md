# Zoho Creator Custom API Setup Guide

To integrate the Parent Registration widget, you will need to update the two Custom APIs in Zoho Creator.

## 1. Fetch Dancer Details (GET API)

This API verifies the Parent Code and returns **a list of all children** associated with that code, along with their Daily Attendance/Event records.

**Setup Instructions:**
1. **API Name**: `fetch_dancer_details`
2. **Method**: `GET`
3. **Arguments**: 
   - `parentCode` (String)
4. **Return Type**: `String`

**Deluge Script:**
```deluge
response = map();
if(parentCode == "")
{
    response.put("status", "error");
    response.put("message", "Parent Code is required.");
    return response.toString();
}

// Query the Master_Dancer_Roster form
dancerRecords = Master_Dancer_Roster[Parent_Registration_Code == parentCode];

if(dancerRecords.count() > 0)
{
    response.put("status", "success");
    dancersList = list();
    
    for each dancer in dancerRecords
    {
        data = map();
        
        // Core Info
        data.put("ID", dancer.ID);
        data.put("Dancer_First_Name", dancer.Dancer_First_Name);
        data.put("Dancer_Last_Name", dancer.Dancer_Last_Name);
        data.put("Dancer_Full_Name", dancer.Dancer_Full_Name);
        
        // Grouping & Placement
        data.put("Default_Room", dancer.Default_Room);
        data.put("Class_Group", dancer.Class_Group);
        data.put("Routine_Group", dancer.Routine_Group);
        
        // Parent / Guardian
        data.put("Parent_Guardian_Name", dancer.Parent_Guardian_Name);
        data.put("Parent_Guardian_Email", dancer.Parent_Guardian_Email);
        data.put("Parent_Guardian_Phone", dancer.Parent_Guardian_Phone);
        
        // Emergency & Pickup
        data.put("Backup_Emergency_Contact_Name", dancer.Backup_Emergency_Contact_Name);
        data.put("Backup_Emergency_Contact_Phone", dancer.Backup_Emergency_Contact_Phone);
        data.put("Designated_Pickup_Drop_O_Person_Name", dancer.Designated_Pickup_Drop_O_Person_Name);
        data.put("Designated_Pickup_Drop_O_Person_Phone", dancer.Designated_Pickup_Drop_O_Person_Phone);
        
        // Medical
        data.put("Medical_Alert", dancer.Medical_Alert);
        data.put("Medical_Details_Description", dancer.Medical_Details_Description);
        
        // Photos (Assuming URL or base64)
        data.put("Dancer_Photo", dancer.Dancer_Photo);
        data.put("Designated_Pickup_Drop_O_Person_Photo", dancer.Designated_Pickup_Drop_O_Person_Photo);
        
        // 1. Fetch Daily Attendance (Used by Parent Registration Widget)
        attendanceRecords = Daily_Attendance[Dancer == dancer.ID];
        attendanceList = list();
        for each att in attendanceRecords {
            attData = map();
            attData.put("ID", att.ID);
            attData.put("Event_Date", att.Event_Date); 
            attData.put("Event_Name", att.Event_Name);
            attendanceList.add(attData);
        }
        data.put("Daily_Attendance", attendanceList);
        
        // 2. Fetch Event Days (Used by Change Order Widget)
        eventDayRecords = Event_Days[Dancer == dancer.ID];
        eventDaysList = list();
        for each day in eventDayRecords {
            dayData = map();
            dayData.put("ID", day.ID);
            dayData.put("Event_Date", day.Event_Date); 
            dayData.put("Event_Name", day.Event_Name);
            dayData.put("Main_Event_ID", day.Event); 
            eventDaysList.add(dayData);
        }
        data.put("Event_Days", eventDaysList);
        
        dancersList.add(data);
    }
    
    response.put("data", dancersList);
}
else
{
    response.put("status", "error");
    response.put("message", "Invalid Parent Code. No children found.");
}

return response.toString();
```

---

## 2. Submit Registration (POST API)

This API accepts the completed form data, updates the `Master_Dancer_Roster` with any changes, updates the `Daily_Attendance` to mark absences, and creates a `Parent_Registration` log record.

**Setup Instructions:**
1. **API Name**: `submit_parent_registration`
2. **Method**: `POST`
3. **Arguments**:
   - `payload` (String)
4. **Return Type**: `String`

**Deluge Script:**
```deluge
response = map();
try
{
    formData = payload.toMap();
    parentCode = formData.get("Parent_Registration_Code");
    dancerID = formData.get("Dancer_ID").toLong();
    
    // 1. Update Master_Dancer_Roster
    dancerRecord = Master_Dancer_Roster[ID == dancerID];
    
    if(dancerRecord.count() > 0)
    {
        // Update fields with corrected data from parent
        dancerRecord.Dancer_First_Name = formData.get("Dancer_First_Name");
        dancerRecord.Parent_Guardian_Name = formData.get("Parent_Guardian_Name");
        dancerRecord.Parent_Guardian_Email = formData.get("Parent_Guardian_Email");
        dancerRecord.Parent_Guardian_Phone = formData.get("Parent_Guardian_Phone");
        
        dancerRecord.Backup_Emergency_Contact_Name = formData.get("Backup_Emergency_Contact_Name");
        dancerRecord.Backup_Emergency_Contact_Phone = formData.get("Backup_Emergency_Contact_Phone");
        
        dancerRecord.Designated_Pickup_Drop_O_Person_Name = formData.get("Designated_Pickup_Drop_O_Person_Name");
        dancerRecord.Designated_Pickup_Drop_O_Person_Phone = formData.get("Designated_Pickup_Drop_O_Person_Phone");
        
        dancerRecord.Medical_Alert = formData.get("Medical_Alert");
        dancerRecord.Medical_Details_Description = formData.get("Medical_Details_Description");
        
        // --- Photo Upload Handling ---
        dancerPhotoB64 = formData.get("Dancer_Photo_Base64");
        if(dancerPhotoB64 != null && dancerPhotoB64 != "")
        {
            // Strip data URI prefix if present
            if(dancerPhotoB64.contains("base64,"))
            {
                dancerPhotoB64 = dancerPhotoB64.getSuffix("base64,");
            }
            dancerFile = zoho.encryption.base64DecodeToFile(dancerPhotoB64, "Dancer_Photo.png");
            dancerRecord.Dancer_Photo = dancerFile;
        }
        
        pickupPhotoB64 = formData.get("Pickup_Photo_Base64");
        if(pickupPhotoB64 != null && pickupPhotoB64 != "")
        {
            // Strip data URI prefix if present
            if(pickupPhotoB64.contains("base64,"))
            {
                pickupPhotoB64 = pickupPhotoB64.getSuffix("base64,");
            }
            pickupFile = zoho.encryption.base64DecodeToFile(pickupPhotoB64, "Pickup_Photo.png");
            dancerRecord.Designated_Pickup_Drop_O_Person_Photo = pickupFile;
        }
        
        // 2. Mark Absent Days
        absentIDsStr = formData.get("Absent_Attendance_IDs");
        if(absentIDsStr != null && absentIDsStr != "")
        {
            absentIDsList = absentIDsStr.toList();
            for each attID in absentIDsList
            {
                attRecord = Daily_Attendance[ID == attID.toLong()];
                if(attRecord.count() > 0)
                {
                    attRecord.Status = "Absent"; // Replace 'Status' with actual field name
                }
            }
        }
        
        // 3. Create a Parent_Registration record
        insert into Parent_Registration
        [
            Added_User = zoho.adminuser
            Parent_Registration_Code = parentCode
            Dancer = dancerID
            Registration_Status = "Completed"
            // Map other fields as necessary
        ];
        
        response.put("status", "success");
        response.put("message", "Registration and attendance updated successfully.");
    }
    else
    {
        response.put("status", "error");
        response.put("message", "Record not found to update.");
    }
}
catch (e)
{
    response.put("status", "error");
    response.put("message", e.toString());
}

return response.toString();
```

---

## 3. Submit Change Order (POST API)

This API accepts the change order payload and creates a new `Change_Order` record.

**Setup Instructions:**
1. **API Name**: `submit_change_order`
2. **Method**: `POST`
3. **Arguments**:
   - `payload` (String)
4. **Return Type**: `String`

**Deluge Script:**
```deluge
response = map();
try
{
    formData = payload.toMap();
    
    // Extract and format Lookup IDs
    dancerId = formData.get("Dancer_ID");
    eventId = formData.get("Event_ID"); // Main Event ID
    eventIdsList = formData.get("Event_Day_IDs"); // List of Event Day IDs
    
    // Create new Change Order record
    coRecord = insert into Change_Orders
    [
        Added_User = zoho.adminuser
        Dancer = if(dancerId != null && dancerId != "", dancerId.toLong(), null)
        Event = if(eventId != null && eventId != "", eventId.toLong(), null)
        Requested_Dates = eventIdsList // This is the multi-select lookup to Event Days
        Change_Type = formData.get("Change_Type")
        Replacement_Person_Name = formData.get("Replacement_Person_Name")
        Replacement_Person_Phone = formData.get("Replacement_Person_Phone")
        Submitted_By = formData.get("Submitted_By_Name")
        Submitted_Email = formData.get("Submitted_By_Email")
        Notes = formData.get("Notes")
        Approval_Status = "Pending"
    ];
    
    // Process Photo Upload
    try {
        photoB64 = formData.get("Replacement_Person_Photo_Base64");
        if(photoB64 != null && photoB64 != "")
        {
            // Strip data URI prefix if present
            if(photoB64.contains("base64,"))
            {
                photoB64 = photoB64.getSuffix("base64,");
            }
            
            // Convert base64 to file object natively
            photoFile = zoho.encryption.base64DecodeToFile(photoB64, "Replacement_Photo.png");
            
            // Update the record
            coRecord.Replacement_Person_Photo = photoFile;
        }
    } catch (e) {
        // Log error to a field if available, or just ignore to allow submission to proceed
        response.put("photo_error", "Failed to process photo: " + e.getMessage());
    }
    
    response.put("status", "success");
    response.put("message", "Change order submitted successfully.");
}
catch (e)
{
    response.put("status", "error");
    response.put("message", e.toString());
}

return response.toString();
```
