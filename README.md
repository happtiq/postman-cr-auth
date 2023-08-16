## Step 1: Service Account Creation
1. Create new Service Account in your project: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Create a JSON Key for the new Service Account:
    * Click on the Service Account Name
    * Go to "Keys"
    * Click "Add Keys"
    * Download the "JSON Key"
## Step 2: Assign Cloud Run roles
1. Go to the Cloud Run services overview: https://console.cloud.google.com/run
2. Tick the checkbox for all relevant Cloud Run Services
3. Ensure the Info Panel on the right is showing. If not, click "Show Info Panel" on the right side of the navigation bar
4. Grant the **Cloud Run Invoker** `(roles/run.invoker)` role to the Service Account

## Step 3: Postman Configuration (Environment)
1. Create an new environment in Postman
2. Add the variable `serviceAccountKey` and insert the JSON contents of the JSON key downloaded in **Step 1**
3. *(Optional)* If all requests for this environment, go to the same Cloud Run Service, add a variable called `cloudRunUrl` with the Cloud Run URL
    * This needs to be in the `https://*.run.app` format, custom domains are not supported for authentication
    * If the individual collections should use different Cloud Run URLs, this variable can be left unset

## Step 4: Postman Configuration (Collection)
1. Create a new collection in Postman
2. Go to "Pre-request Script" in the collection
3. Paste the contents of the `preq-request-script.js` of this github repository
4. *(Optional)* If you choose to overwrite, or define the Cloud Run service URL in the collection, go to `Variables` and set the `cloudRunUrl` to the Cloud Run URL of the service
    * This needs to be in the `https://*.run.app` format, custom domains are not supported for authentication

## Step 5: Postman Configuration (Request)
1. Create a new request in your collection
2. Go to "Authorization" in the request
3. Select the Type `Bearer Token`
4. Set Token to `{{accessToken}}`
5. Set the URL to your Cloud Run Service
6. Hit **SEND**