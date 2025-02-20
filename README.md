# linkedIn-post-lmstudio

You have to have a linkedin app - which by extension means you need a linked in page/company. 

Once you set those up you can request an access token 
Once you have that call the https://www.linkedin.com/developers/apps/221689848/products/sign-in-with-linkedin-using-openid-connect/endpoints

to get your sub (linkedin id)

then make an env file with 

```
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_USER_ID=
```

To run 

`npm run start` make sure LM studio is up and a model is loaded
Right now I have it with key inputs - but have had it assigned to a cron job without key inputs simple change if thats what you want to do.