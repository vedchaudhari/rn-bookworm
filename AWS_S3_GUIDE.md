# AWS S3 Configuration Recommendations

To ensure your mobile app can upload and retrieve profile images, you need to configure three things in the AWS Console.

## 1. IAM Policy (for the backend user)
The user whose credentials you are using in `.env` (`AKIAXI6Q...`) needs permission to interact with the bucket. Attach this policy to that IAM user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::readsphere-bucket",
                "arn:aws:s3:::readsphere-bucket/*"
            ]
        }
    ]
}
```

## 2. CORS Configuration (Crucial for Mobile/Web Uploads)
Since the mobile app uploads directly to S3 via the presigned URL, S3 must allow requests from outside its domain.
1. Go to the **S3 Bucket** -> **Permissions** tab.
2. Scroll down to **Cross-origin resource sharing (CORS)** and click Edit.
3. Paste this:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```
> [!IMPORTANT]
> Change `"AllowedOrigins": ["*"]` to your actual domain or app intent later for better security.

## 3. Block Public Access & Bucket Policy
Since your code currently generates **presigned URLs** for reading images (recommended), you **do not** need the bucket to be public.

*   **Block Public Access**: Should be **ON** (all settings checked).
*   **Bucket Policy**: Leave it empty or keep only the restricted IAM access.

---

## ⚠️ Important Note on Regions
In your current `s3.ts`:
- The **Client** defaults to `us-east-1` (Northern Virginia).
- The **URL Generator** defaults to `ap-south-1` (Mumbai).

If your bucket is in Mumbai, you **must** update line 8 in `s3.ts` to default to `ap-south-1` as well, or you will continue getting "Access Denied" or "Host Resolution" errors.
---

## 4. Public Access (Optional - for Public URLs)
If you want your images to be accessible via raw public URLs without signing:
1. In the **Permissions** tab, click Edit for **Block public access (bucket settings)**.
2. Uncheck all boxes and Save.
3. Edit the **Bucket policy** and add this (replace `readsphere-bucket` with yours):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::readsphere-bucket/profiles/*"
        }
    ]
}
```
> [!CAUTION]
> This makes all files in the `profiles/` folder publicly viewable by anyone.
