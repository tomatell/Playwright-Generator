# Playwright-Generator
Node.js Playwright Generator
# Description
A Node.js script that automatically generates a Playwright automation script based on credentials and settings provided via an interactive prompt.
# How to use.
1. Script Generation Tool (generator.js)
Executing this file will automatically generate a configuration file (salesforce_bot.js) tailored to your environment.
Running the Tool:
Run node generator.js in your terminal. Enter the required information as prompted.

# Running the Script:
Execute the generated salesforce_bot.js file:
node salesforce_bot.js

You will be prompted to enter the "master password" when you run the script. Only if the correct password is provided will the Salesforce password be decrypted internally and the login process initiated.

＃ Additional Information
Dependencies: You must run npm install playwright before executing the scripts.

Security: We use scryptSync for encryption. By setting a strong, hard-to-guess master password, it becomes extremely difficult to recover the original password, even in the unlikely event that salesforce_bot.js is leaked.

Operational Tip: If the post-login operations (elements to click) are complex, we recommend using Playwright's Codegen feature to record your actions. Using the selectors obtained from Codegen when running generator.js will result in a much smoother setup.
