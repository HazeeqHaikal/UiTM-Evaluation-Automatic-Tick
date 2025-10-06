// Configuration for survey types and their URLs
const SURVEY_CONFIG = {
  "https://ufuture.uitm.edu.my/sufo/questions/index/": "sufo",
  "https://ufuture.uitm.edu.my/kifo/questions/index/": "kifo",
  "https://ufuture.uitm.edu.my/ess/answers/entry/": "entrance",
  "https://ufuture.uitm.edu.my/ess/answers/exits/": "exit",
};

const DASHBOARD_URL = "https://ufuture.uitm.edu.my/ess/dashboard/home";

// Status types for UI feedback
const STATUS_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  ERROR: "error",
  LOADING: "loading",
};

// SVG icons for different status states
const ICONS = {
  info: `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>`,
  success: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>`,
  error: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>`,
  loading: `<path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>`,
};

// Update status UI with type-based styling
function updateStatus(message, type = STATUS_TYPES.INFO) {
  const statusElement = document.getElementById("status");
  const statusMessage = document.getElementById("status-message");
  const statusIcon = document.getElementById("status-icon");

  if (!statusElement || !statusMessage || !statusIcon) return;

  statusMessage.textContent = message;

  // Remove all status classes
  statusElement.className = "rounded-xl p-4 shadow-md transition-all duration-300";

  // Add appropriate class and icon based on type
  switch (type) {
    case STATUS_TYPES.SUCCESS:
      statusElement.classList.add("status-success");
      statusIcon.innerHTML = ICONS.success;
      statusIcon.classList.remove("text-blue-500", "text-red-500", "animate-spin");
      statusIcon.classList.add("text-green-500");
      break;
    case STATUS_TYPES.ERROR:
      statusElement.classList.add("status-error");
      statusIcon.innerHTML = ICONS.error;
      statusIcon.classList.remove("text-blue-500", "text-green-500", "animate-spin");
      statusIcon.classList.add("text-red-500");
      break;
    case STATUS_TYPES.LOADING:
      statusElement.classList.add("status-loading");
      statusIcon.innerHTML = ICONS.loading;
      statusIcon.classList.remove("text-green-500", "text-red-500");
      statusIcon.classList.add("text-blue-500", "animate-spin");
      break;
    default:
      statusElement.classList.add("status-info");
      statusIcon.innerHTML = ICONS.info;
      statusIcon.classList.remove("text-green-500", "text-red-500", "animate-spin");
      statusIcon.classList.add("text-blue-500");
  }
}

// Validate if URL is a supported survey page or dashboard
function validateSurveyUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Check if it's the dashboard
  if (url.includes(DASHBOARD_URL)) {
    return "dashboard";
  }

  // Check if it's a survey page
  for (const [surveyUrl, surveyType] of Object.entries(SURVEY_CONFIG)) {
    if (url.includes(surveyUrl)) {
      return surveyType;
    }
  }
  return null;
}

// Process dashboard page - find entrance/exit survey links directly
function processDashboard() {
  try {
    const surveyLinks = [];

    // Find all links on the dashboard
    const links = document.querySelectorAll('a');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim().toLowerCase();

      // Look for entrance/exit survey links
      if (href && (href.includes('/ess/answers/entry/') || href.includes('/ess/answers/exits/'))) {
        // Check if it's an "Answer" link (not completed)
        if (text.includes('answer') || text === 'answer') {
          const fullUrl = href.startsWith('http') ? href : `https://ufuture.uitm.edu.my${href}`;
          surveyLinks.push(fullUrl);
        }
      }
    });

    // Remove duplicates
    const uniqueLinks = [...new Set(surveyLinks)];

    if (uniqueLinks.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No incomplete surveys found'
      };
    }

    // Store links for processing
    sessionStorage.setItem('ufuture_survey_queue', JSON.stringify(uniqueLinks));
    sessionStorage.setItem('ufuture_dashboard_url', window.location.href);
    sessionStorage.setItem('ufuture_dashboard_mode', 'true');

    // Navigate to first survey
    window.location.href = uniqueLinks[0];

    return {
      success: true,
      count: uniqueLinks.length,
      message: `Found ${uniqueLinks.length} survey(s) to process`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main auto-fill function executed in the survey page context
function autoFillSurvey(surveyType) {
  try {
    // Validate survey type
    const validTypes = ["sufo", "kifo", "entrance", "exit"];
    if (!validTypes.includes(surveyType)) {
      throw new Error("Invalid survey type");
    }

    // Select and click appropriate radio buttons
    const radios = document.querySelectorAll("input[type='radio']");
    if (radios.length === 0) {
      throw new Error("No radio buttons found on this page");
    }

    let clickedCount = 0;
    radios.forEach((radio) => {
      const value = parseInt(radio.value, 10);
      if (isNaN(value)) return;

      // Different logic for different survey types
      if (surveyType === "entrance" || surveyType === "kifo") {
        if (value === 1) {
          radio.click();
          clickedCount++;
        }
      } else {
        radio.click();
        clickedCount++;
      }
    });

    // Check if we're in queue mode
    const queueData = sessionStorage.getItem('ufuture_survey_queue');
    const isQueueMode = queueData !== null;

    // Find and click submit button
    const buttons = document.querySelectorAll("button");
    let submitFound = false;

    for (const button of buttons) {
      if (button.innerText.trim().toLowerCase() === "submit") {
        button.click();
        submitFound = true;

        // If in queue mode, navigate to next survey after a delay
        if (isQueueMode) {
          setTimeout(() => {
            const queue = JSON.parse(sessionStorage.getItem('ufuture_survey_queue') || '[]');
            const currentUrl = window.location.href;

            // Remove current URL from queue
            const updatedQueue = queue.filter(url => !currentUrl.includes(url));

            if (updatedQueue.length > 0) {
              // Navigate to next survey
              sessionStorage.setItem('ufuture_survey_queue', JSON.stringify(updatedQueue));
              window.location.href = updatedQueue[0];
            } else {
              // All done, go back to dashboard
              const dashboardUrl = sessionStorage.getItem('ufuture_dashboard_url');
              sessionStorage.removeItem('ufuture_survey_queue');
              sessionStorage.removeItem('ufuture_dashboard_url');
              sessionStorage.removeItem('ufuture_dashboard_mode');
              if (dashboardUrl) {
                window.location.href = dashboardUrl;
              }
            }
          }, 1500);
        }
        break;
      }
    }

    return {
      success: true,
      clickedCount,
      submitFound,
      isQueueMode,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Initialize the extension
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");

  if (!startButton) {
    console.error("Start button not found");
    return;
  }

  startButton.addEventListener("click", async () => {
    try {
      // Disable button and show loading state
      startButton.disabled = true;
      updateStatus("Processing your request...", STATUS_TYPES.LOADING);

      // Query active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tabs || tabs.length === 0) {
        throw new Error("No active tab found");
      }

      const currentTab = tabs[0];
      const surveyType = validateSurveyUrl(currentTab.url);

      if (!surveyType) {
        updateStatus(
          "This page is not supported. Please navigate to the UiTM dashboard or a survey page.",
          STATUS_TYPES.ERROR
        );

        setTimeout(() => {
          updateStatus(
            "Ready to auto-fill! Click on the dashboard to process all entrance/exit surveys automatically.",
            STATUS_TYPES.INFO
          );
          startButton.disabled = false;
        }, 3500);
        return;
      }

      // Handle different page types
      if (surveyType === "dashboard") {
        // Execute dashboard processing
        const results = await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: processDashboard,
        });

        if (results && results[0] && results[0].result) {
          const result = results[0].result;

          if (result.success) {
            if (result.count === 0) {
              updateStatus(result.message, STATUS_TYPES.INFO);
            } else {
              updateStatus(
                `${result.message}. Auto-filling will start automatically.`,
                STATUS_TYPES.SUCCESS
              );
            }
          } else {
            throw new Error(result.error || "Dashboard processing failed");
          }
        } else {
          throw new Error("Failed to process dashboard");
        }
      } else {
        // Execute auto-fill script for individual survey
        const results = await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: autoFillSurvey,
          args: [surveyType],
        });

        // Check execution results
        if (results && results[0] && results[0].result) {
          const result = results[0].result;

          if (result.success) {
            updateStatus(
              `Successfully auto-filled! ${result.clickedCount} option${result.clickedCount !== 1 ? "s" : ""} selected${result.submitFound ? " and submitted" : ""}.`,
              STATUS_TYPES.SUCCESS
            );
          } else {
            throw new Error(result.error || "Auto-fill failed");
          }
        } else {
          throw new Error("Failed to execute auto-fill");
        }
      }

      // Reset to default state after delay
      setTimeout(() => {
        updateStatus(
          "Ready to auto-fill! Click on the dashboard to process all entrance/exit surveys automatically.",
          STATUS_TYPES.INFO
        );
        startButton.disabled = false;
      }, 3500);
    } catch (error) {
      console.error("Auto-fill error:", error);
      updateStatus(
        `Error: ${error.message || "An unexpected error occurred. Please try again."}`,
        STATUS_TYPES.ERROR
      );

      setTimeout(() => {
        updateStatus(
          "Ready to auto-fill! Click on the dashboard to process all entrance/exit surveys automatically.",
          STATUS_TYPES.INFO
        );
        startButton.disabled = false;
      }, 3500);
    }
  });
});
