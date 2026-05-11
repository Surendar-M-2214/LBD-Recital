# Zoho Creator Custom API Setup Guide

To integrate the Parent Registration widget, you will need to create two Custom APIs in Zoho Creator. These APIs will be called from the frontend widget using your Public Key to authenticate the requests.

## 1. Fetch Dancer Details (GET API)

This API verifies the Parent Code and returns all dancer details from `Master_Dancer_Roster` to prefill the form.

**Setup Instructions:**
1. In Zoho Creator, go to **Microservices** -> **Custom APIs**.
2. Click **Create New API**.
3. **API Name**: `fetch_dancer_details`
4. **Method**: `GET`
5. **Arguments**: 
   - `parentCode` (String)
   - `lastName` (String)
6. **Return Type**: `String`

**Deluge Script:**
```deluge
response = map();
if(parentCode == "" || lastName == "")
{
    response.put("status", "error");
    response.put("message", "Parent Code and Last Name are required.");
    return response.toString();
}

// Query the Master_Dancer_Roster form
dancerRecords = Master_Dancer_Roster[Parent_Registration_Code == parentCode && Dancer_Last_Name == lastName];

if(dancerRecords.count() > 0)
{
    dancerRecord = dancerRecords.toList().get(0);
    
    response.put("status", "success");
    data = map();
    
    // Core Info
    data.put("ID", dancerRecord.ID);
    data.put("Dancer_First_Name", dancerRecord.Dancer_First_Name);
    data.put("Dancer_Last_Name", dancerRecord.Dancer_Last_Name);
    data.put("Dancer_Full_Name", dancerRecord.Dancer_Full_Name);
    data.put("Internal_Dancer_ID", dancerRecord.Internal_Dancer_ID);
    
    // Grouping & Placement
    data.put("Default_Room", dancerRecord.Default_Room);
    data.put("Class_Group", dancerRecord.Class_Group);
    data.put("Routine_Group", dancerRecord.Routine_Group);
    data.put("Events", dancerRecord.Events);
    
    // Siblings
    data.put("Have_Siblings", dancerRecord.Have_Siblings);
    data.put("Siblings_Name", dancerRecord.Siblings_Name);
    
    // Parent / Guardian
    data.put("Parent_Guardian_Name", dancerRecord.Parent_Guardian_Name);
    data.put("Parent_Guardian_Email", dancerRecord.Parent_Guardian_Email);
    data.put("Parent_Guardian_Phone", dancerRecord.Parent_Guardian_Phone);
    
    // Emergency & Pickup
    data.put("Backup_Emergency_Contact_Name", dancerRecord.Backup_Emergency_Contact_Name);
    data.put("Backup_Emergency_Contact_Phone", dancerRecord.Backup_Emergency_Contact_Phone);
    data.put("Designated_Pickup_Drop_O_Person_Name", dancerRecord.Designated_Pickup_Drop_O_Person_Name);
    data.put("Designated_Pickup_Drop_O_Person_Phone", dancerRecord.Designated_Pickup_Drop_O_Person_Phone);
    
    // Medical
    data.put("Medical_Alert", dancerRecord.Medical_Alert);
    data.put("Medical_Details_Description", dancerRecord.Medical_Details_Description);
    
    // Photos
    // In Creator, an image field value can be returned as a path. 
    // To display it in a public widget without login, it usually requires a published report URL or base64.
    // For now, we return the raw value. The JS will attempt to render it.
    data.put("Dancer_Photo", dancerRecord.Dancer_Photo);
    data.put("Designated_Pickup_Drop_O_Person_Photo", dancerRecord.Designated_Pickup_Drop_O_Person_Photo);
    
    response.put("data", data);
}
else
{
    response.put("status", "error");
    response.put("message", "Invalid Parent Code or Last Name.");
}

return response.toString();
```

---

## 2. Submit Registration (POST API)

This API accepts the completed form data, updates the `Master_Dancer_Roster` with any changes, and can also create a `Parent_Registration` record if needed.

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
    lastName = formData.get("Dancer_Last_Name");
    
    // 1. Update Master_Dancer_Roster
    dancerRecord = Master_Dancer_Roster[Parent_Registration_Code == parentCode && Dancer_Last_Name == lastName];
    
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
        
        // --- Handling Base64 Images Updates ---
        // If the parent changed the photo, it will come through as Base64.
        // To update an image field in Creator via Deluge with Base64, you typically use `invokeurl` 
        // to call the Creator File Upload API.
        
        dancerPhotoB64 = formData.get("Dancer_Photo_Base64");
        if(dancerPhotoB64 != null && dancerPhotoB64 != "")
        {
            // Implementation detail: Decode Base64 and upload via API
        }
        
        pickupPhotoB64 = formData.get("Pickup_Photo_Base64");
        if(pickupPhotoB64 != null && pickupPhotoB64 != "")
        {
            // Implementation detail: Decode Base64 and upload via API
        }
        
        // 2. (Optional) Create a specific Parent_Registration log record
        insert into Parent_Registration
        [
            Added_User = zoho.adminuser
            Parent_Registration_Code = parentCode
            Dancer_Last_Name = lastName
            Registration_Status = "Completed"
            // Map other fields as necessary
        ];
        
        response.put("status", "success");
        response.put("message", "Master Roster updated successfully.");
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
