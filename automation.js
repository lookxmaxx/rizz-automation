const { chromium } = require('playwright');  // Import Playwright
const { google } = require('googleapis');  // Import Google Sheets API
const fs = require('fs');

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'C:/Users/admin/OneDrive/Desktop/rizz-automation/credentials.json',  // Correct the path
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Your Google Sheet ID and range
const SPREADSHEET_ID = '13bcuDvY6uVA005BUwFCU1Vucns-NIxBLX2VTCv7fotc';  // Replace with your actual sheet ID
const RANGE = 'Form Responses 1!A2:A';  // Range where the links are located (Column A)

// Keep track of processed links (this could be a file or variable in the future)
let processedLinks = [];
let lastProcessedLink = '';

// Load previously processed links and the last processed link (from a file, local storage, etc.)
function loadProcessedLinks() {
  try {
    const data = fs.readFileSync('processed_links.json', 'utf-8');
    const parsedData = JSON.parse(data);
    processedLinks = parsedData.processedLinks;
    lastProcessedLink = parsedData.lastProcessedLink || '';
  } catch (err) {
    console.log('No previous processed links found, starting fresh.');
  }
}

// Save processed links and the last processed link to a file
function saveProcessedLinks() {
  const data = {
    processedLinks,
    lastProcessedLink,
  };
  fs.writeFileSync('processed_links.json', JSON.stringify(data));
}

// Function to validate if a link is a valid URL
function isValidUrl(link) {
  const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;
  return urlPattern.test(link);
}

// Function to get new links from Google Sheets
async function getLinksFromSheet() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = res.data.values;
    if (rows && rows.length) {
      // Get the latest valid link
      const latestLink = rows[rows.length - 1][0]; // Last link added to the sheet
      console.log(`Latest link found: ${latestLink}`);

      // Check if the latest link is valid and hasn't been processed before
      if (isValidUrl(latestLink) && !processedLinks.includes(latestLink)) {
        console.log('New valid link detected!');
        processedLinks.push(latestLink);  // Add new link to the processed list
        lastProcessedLink = latestLink;  // Set the last processed link
        automateSubmission(latestLink);  // Trigger Playwright for the latest link
      } else {
        console.log('No new valid link to submit or link has already been processed.');
      }

      // Save the processed links and last processed link
      saveProcessedLinks();
    } else {
      console.log('No new links found.');
    }
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
  }
}

// Playwright automation to submit the link
async function automateSubmission(link) {
  let browser;
  let page;

  try {
    // Launch browser and load the session state
    browser = await chromium.launch({ headless: false });  // Launch browser in non-headless mode
    const context = await browser.newContext({ storageState: 'state.json' });  // Load saved session
    page = await context.newPage();

    // Step 1: Go to the Rizz App
    await page.goto('https://creator.rizz.app');

    // Check if we are on the login page (this indicates the session wasn't loaded correctly)
    if (await page.isVisible('button:has-text("Join Now")')) {
      console.log('Session expired. Logging in again...');
      await page.click('button:has-text("Join Now")');
      await page.fill('input#email', 'lookxmaxx@gmail.com');
      await page.click('button:has-text("Continue")');

      console.log('Please enter the OTP manually...');
      await page.waitForSelector('input[type="text"][maxlength="6"]');
      await page.pause();  // Wait for manual OTP input

      // Wait after OTP entry (15 seconds)
      await page.waitForTimeout(15000);
    }

    // Step 6: Click on "Posted" to deactivate the search bar
    await page.click('div.tss-1akey0g-MUIDataTableHeadCell-data');  // Click on "Posted"

    // Step 7: Click the menu button (lookxmaxx@gmail.com)
    await page.click('button:has-text("lookxmaxx@gmail.com")');

    // Step 8: Click on "Campaigns"
    await page.click('button:has-text("Campaigns")');

    // Step 9: Wait before clicking "My Campaigns"
    await page.waitForTimeout(5000);  // Wait for 5 seconds

    // Step 10: Click "My Campaigns"
    await page.click('li:has-text("Campaigns")');

    // Step 11: Wait to ensure the page renders completely
    await page.waitForTimeout(3000);  // Wait for 3 seconds

    // Step 12: Click the "Submit Post" button using the provided selector
    await page.click('#root > div > div > div > div > div:nth-child(15) > div.flex.justify-between.flex-col.md\\:flex-row.items-start.gap-4 > div.flex.flex-col.md\\:flex-row.w-full.md\\:w-fit.items-center.md\\:self-center.gap-4.pt-2.md\\:pt-0 > div.md\\:text-nowrap.w-full.md\\:w-fit > button');

    // Step 13: Paste the link into the input field
    await page.fill('input[type="url"]', link);

    // Step 14: Wait for 5 seconds before clicking the last submit button
    await page.waitForTimeout(5000);  // Wait for 5 seconds

    // Step 15: Click the last "Submit" button in the modal
    await page.click('body > div.ReactModalPortal > div > div > div > div.text-white.p-4.w-full.border-t-2.text-center.mt-6 > form > button');

    console.log('Post submitted successfully!');

    // Step 16: Save session to avoid logging in again
    await context.storageState({ path: 'state.json' });  // Save session to a file

    console.log('Session saved for future use!');
  } catch (error) {
    console.error('Error during automation process:', error);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script at regular intervals to check for new links (every 30 seconds)
setInterval(getLinksFromSheet, 30000); // Check the Google Sheets every 30 seconds
