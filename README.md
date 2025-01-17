# Cyberwright Backend/API Documentation
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

This API is built with the NestJS framework and utilized MongoDB as a database. 

## Getting Started
1. Modify [.env.example](.env.example) to `.env` and alter the contents with the relevant data.
2. Run `npm install` to install relevant node modules
3. Run `npm start` to start the API

## Documentation
You will find documentation about the API's endpoints and their supported methods, required data for requests, and format of responses.

### Authentication Endpoint: `/auth`

#### 1. **/auth/signup**
- **Description**: Allows a user to sign up and create a new account.
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "name": "user",
        "password": "epicpassword",
        "email": "admin@cyberwright.org"
    }
    ```
- **Response**:
    ```json
    {
        "access_token": "JWT_TOKEN"
    }
    ```



#### 2. **/auth/login**
- **Description**: Allows a user to log in to an existing account.
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "password": "epicpassword",
        "email": "admin@cyberwright.org"
    }
    ```
- **Response**:
    ```json
    {
        "access_token": "JWT_TOKEN"
    }
    ```


#### 3. **/auth/validateToken**
- **Description**: Endpoint to check if a JWT token is valid or not
- **Method**: `GET`
- **Response**:
    ```json
    {
        "valid": true
    }
    ```


#### 4. **/auth/googleCallback**
- **Description**: Endpoint to recieve Google callback code and exchange for an access token
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "code": "[google code]",
        "redirect_uri": "http://localhost:12345/"
    }
    ```
- **Response**:
    ```json
    {
        "access_token": "JWT_TOKEN"
    }
    ```



### User Endpoint: `/user`

All requests to this endpoint require an **access token** attached as a Bearer token in the `Authorization` header.

#### 1. **/user/accountInfo**
- **Description**: Returns an authorized user's account information (name, email, profile picture, etc.).
- **Method**: `GET`
- **Response**:
    ```json
    {
        "name": "user",
        "email": "admin@cyberwright.org",
        "pfp": "https://pfp"
    }
    ```



#### 2. **/user/changePassword**
- **Description**: Allows a user to change their password.
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "new_password": "epicpassword"
    }
    ```
- **Response**:
    ```json
    {
        "changed": true
    }
    ```



#### 3. **/user/disabled**
- **Description**: Allows a user to check if their account is disabled.
- **Method**: `GET`
- **Response**:
    ```json
    {
        "disabled": true
    }
    ```


### AI Endpoint: `/ai`

All requests to this endpoint require an **access token** attached as a Bearer token in the `Authorization` header. 



#### 1. **/ai/initUploadSession**
- **Description**: Allows a user to initiate an upload session and obtain an upload id.
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "dir_name": "test",
        "num_files": 3
    }
    ```
- **Response**:
    ```json
    {
        "uid": "UUID"
    }
    ```


#### 2. **/ai/uploadFile**
- **Description**: Allows a user to upload files to the associated upload ID.
- **Method**: `POST`
- **Request Body**:
    ```
    uid=Upload ID
    file=@test.txt
    ```
    (Form data)
- **Response**:
    ```json
    {
        "uploaded": true
    }
    ```


#### 3. **/ai/scanUpload**
- **Description**: Allows a user to scan the uploaded files.
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "uid": "Upload ID",
    }
    ```
- **Response**:
    ```json
    {
        "diagnostics": []
    }
    


#### 4. **/ai/getDiagnostics**
- **Description**: Allows a user to check and obtain their upload's diagnostics
- **Method**: `POST`
- **Request Body**:
    ```json
    {
        "uid": "Upload ID",
    }
    ```
- **Response**:
    ```json
    {
        "status": "Some status message",
        "diagnostics": [] || null
    }
