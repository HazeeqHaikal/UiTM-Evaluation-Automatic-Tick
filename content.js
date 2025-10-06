// Content script to auto-fill surveys when in queue mode
(function() {
  const isQueueMode = sessionStorage.getItem('ufuture_survey_queue');
  const isDashboardMode = sessionStorage.getItem('ufuture_dashboard_mode');
  const currentUrl = window.location.href;

  // Check if we're back on the dashboard with remaining surveys
  if (isDashboardMode && isQueueMode && currentUrl.includes('/ess/dashboard/home')) {
    setTimeout(() => {
      continueProcessing();
    }, 1500);
  }

  // Auto-fill survey when in queue mode
  if (isQueueMode && (currentUrl.includes('/answers/entry/') || currentUrl.includes('/answers/exits/'))) {
    setTimeout(() => {
      autoFillCurrentSurvey();
    }, 1500);
  }

  // Continue processing remaining surveys from dashboard
  function continueProcessing() {
    try {
      const queue = JSON.parse(sessionStorage.getItem('ufuture_survey_queue') || '[]');

      if (queue.length > 0) {
        // Navigate to next survey
        window.location.href = queue[0];
      } else {
        // All done, clear session data
        sessionStorage.removeItem('ufuture_survey_queue');
        sessionStorage.removeItem('ufuture_dashboard_url');
        sessionStorage.removeItem('ufuture_dashboard_mode');
      }
    } catch (error) {
      console.error('Continue processing error:', error);
    }
  }

  // Auto-fill survey function
  function autoFillCurrentSurvey() {
    try {
      // Remove current URL from queue immediately
      const queue = JSON.parse(sessionStorage.getItem('ufuture_survey_queue') || '[]');
      const updatedQueue = queue.filter(url => !currentUrl.includes(url));
      sessionStorage.setItem('ufuture_survey_queue', JSON.stringify(updatedQueue));

      // Determine survey type based on URL
      let surveyType = "entrance";
      if (currentUrl.includes('/answers/exits/')) {
        surveyType = "exit";
      }

      // Select and click radio buttons
      const radios = document.querySelectorAll("input[type='radio']");
      let clickedCount = 0;

      radios.forEach((radio) => {
        const value = parseInt(radio.value, 10);
        if (isNaN(value)) return;

        if (surveyType === "entrance") {
          if (value === 1) {
            radio.click();
            clickedCount++;
          }
        } else {
          radio.click();
          clickedCount++;
        }
      });

      // Find and click submit button
      setTimeout(() => {
        const buttons = document.querySelectorAll("button");
        for (const button of buttons) {
          if (button.innerText.trim().toLowerCase() === "submit") {
            button.click();
            console.log(`Auto-filled and submitted ${clickedCount} options for ${surveyType} survey`);
            // The page will redirect back to dashboard automatically
            // The content script will detect it and continue processing
            break;
          }
        }
      }, 500);
    } catch (error) {
      console.error('Auto-fill error:', error);
    }
  }
})();
