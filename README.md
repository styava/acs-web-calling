# Azure Communication Services 
### Voice/Video calling (ACS-ACS and Teams Interop) sample

## Create a communication resource in Azure portal
- Login to portal.azure.com
- Search for Communication Services and create a communication service resource.
- Once created, go to keys section and copy credentials and create a .env file at the root of the project with the below values.
```
REACT_APP_ACS_CONNECTION_STRING=<ACS_CONNECTION_STRING>
REACT_APP_ACS_ENDPOINT=<ACS_ENDPOINT>
REACT_APP_ACS_KEY=<ACS_KEY>
```

## Run the App

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Additional reading
- [Azure Communication Services](aka.ms/AzureCommunicationServices)
- [Azure Communication Services Documentation](aka.ms/communication-services-overview)
- [Azure Communication Services SDKs](aka.ms/ACS-SDKs)