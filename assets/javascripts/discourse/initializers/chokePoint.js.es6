const NavigationDefaultController = require('discourse/components/d-navigation').default;
const SearchResultsDefaultController = require('discourse/controllers/full-page-search').default;

export default {
  name: 'chokepoint',
  initialize: function() {
    const version = 'v1.1.1';
    let showChokePoint = false;
    const applicationArray = [];
    const communityURL = window.location.origin;
    let endpointURL;
    if (/community.bitnami.com/.test(window.location.host)) {
      endpointURL="https://bndiagnostic-retrieval.bitnami.com"
    } else {
      endpointURL="https://bndiagnostic-retrieval.dev.bitnami.net"
    }
    let chokepointMetadata;

    /**
    * Sort objects element alphabetically
    * @param  {String} prop Property to compare
    */
    function propComparator(prop) {
      return function(a, b) {
        if (a[prop] > b[prop]) {
          return 1;
        } if (a[prop] < b[prop]) {
          return -1;
        }
        return 0;
      };
    }

    /**
    * Escape HTML special chars
    * @param  {String} text area filles
    */
    function escapeHtml(text) {
      return text.replace(/[&<>"'\/]/g, function (s) {
        var entityMap = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': '&quot;',
          "'": '&#39;',
          "/": '&#x2F;'
        };

        return entityMap[s];
      });
    }

    /**
    * Send GA event (or console.log if the user is staff)
    * @param  {String} type      Event type
    * @param  {String} extraInfo Add more text to the event data
    */
    function generateEvent(type, extraInfo) {
      try {
        const d = new Date();
        const date = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        let info = `[${date}] ${version} ${Discourse.User.current().get('id')}`;
        if (extraInfo) info += ` : ${extraInfo}`;

        if ((!Discourse.User.current().staff) && (typeof ga !== 'undefined')) {
          ga('send', 'event', 'SupportCase', type, info);
        } else {
          console.log(type, info);
        }
      } catch (e) {
        const d = new Date();
        const date = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        const info = `[${date}] ${version} ${Discourse.User.current().get('id')} generateEvent - ${e} ${navigator.userAgent}`;
        if ((!Discourse.User.current().staff) && (typeof ga !== 'undefined')) {
          ga('send', 'event', 'SupportCase', 'Failure', info);
        } else {
          console.log('Failure', info);
        }
      }
    }

    /**
    * Show 'New Topic' button without chokepoint and generate a GA failure event
    * @param  {String} error  Error message
    */
    function withoutChokepoint(error) {
      $('#create-topic').show();
      showChokePoint = false;
      generateEvent('Failure', `${error} : ${navigator.userAgent}`);
    }

    /**
    * Function implementing chokePoint logic
    */
    function chokePoint() {
      try {
        if ((typeof disableChokePoint !== 'undefined' && disableChokePoint) || !showChokePoint) {
          generateEvent('New', `No chokepoint - ${typeof disableChokePoint !== 'undefined'} - ${typeof disableChokePoint !== 'undefined' && disableChokePoint} - ${showChokePoint}`);
          return true;
        }
        // Generate New event when click on New Topic
        generateEvent('New');

        // Change default delimiters
        $.views.settings.delimiters('[[', ']]', '^');

        /**
        * Get the useful links information
        */
        window.getUsefulLinks = function getUsefulLinks(usefulLinks, topicArray, app, topic) {
          $('.useful__links__results').empty();
          $('.useful__links__results').append(`<pre class="useful__link">Loading results...</pre>`);

          const topicID = _.filter(topicArray, {topic: topic})[0].id;
          let arr = usefulLinks[topicID]["common"];

          if (app === "WordPress + NGINX + SSL") app = "wordpress-pro";
          const appID = app.replace(/\s+/g, '-').toLowerCase();
          if (usefulLinks[topicID][appID]) {
            arr = arr.concat(usefulLinks[topicID][appID]);
          }

          $('.useful__links__results').empty();
          for (let i = 0; i < arr.length; i++) {
            $('.useful__links__results').append(`<h5>${arr[i].title}</h5>`);
            if (Array.isArray(arr[i].link)) {
              for (let j = 0; j < arr[i].link.length; j++) {
                $('.useful__links__results').append(`<a class="useful__link" target="_blank" style="display: table;" href="${arr[i].link[j]}">${arr[i].link[j]}</a>`);
              }
            } else {
              $('.useful__links__results').append(`<a class="useful__link" target="_blank" href="${arr[i].link}">${arr[i].link}</a>`);
            }
          }
        }

        /**
        * Get the bndiagnostic information
        */
        window.getBndiagnostic = function getBndiagnostic(bnsupport) {
          $('.bndiagnostic__results').empty();
          $('.bndiagnostic__results').append(`<pre class="bndiagnostic__text">Loading results...</pre>`);

          $.get(`${endpointURL}?bnsupportID=${bnsupport}`)
            .done(function(value) {
              allData.bndiagnosticOutput = value;
              $('.button-accent').removeAttr('disabled');
              $('.bndiagnostic__results').empty();
              const arr = value.split("\n");
              for (let i = 0; i < arr.length; i++) {
                if (/\s*http.*/.test(arr[i])) {
                  $('.bndiagnostic__results').append(`<a class="bndiagnostic__text" target="_blank" href="${arr[i]}">${arr[i]}</a>`);
                } else {
                  $('.bndiagnostic__results').append(`<pre class="bndiagnostic__text">${arr[i]}</pre>`);
                }
              }
            })
            .fail(function() {
              const bnsupportURL="https://docs.bitnami.com/general/how-to/understand-bnsupport/#run-the-bitnami-support-tool"
              $('.bndiagnostic__results').empty();
              $('.bndiagnostic__results').append(`<pre class="bndiagnostic__text">Couldn't obtain data or data is outdated (older than 2 hours). Please update the Bitnami Support Tool to the latest version and run it again

<a href="${bnsupportURL}" target="_blank">${bnsupportURL}</a>

If you continue running into issues when running the Bitnami Support tool, please create a new support request using "Bitnami Support Tool" option when clicking on "+ New Topic".
</pre>`);
            })
        }

        const allData = {
          typeSelected: null,
          typeValues: chokepointMetadata.typeArray,
          platformSelected: null,
          platformValues: chokepointMetadata.platformArray,
          applicationSelected: null,
          applicationValues: applicationArray,
          topicSelected: null,
          topicValues: chokepointMetadata.topicArray,
          titleFilled: null,
          bnsupportFilled: null,
          bndiagnosticOutput: null,
          bndiagnosticReasonsValues: chokepointMetadata.bndiagnosticReasonsArray,
          bndiagnosticReasonSelected: null,
          bndiagnosticReasonFilled: null,
          textareaFilled: null,
          textareaSanitized: null,
          currentPage: 1,
          createTopic: 1,
          getUsefulLinks: getUsefulLinks,
          getBndiagnostic: getBndiagnostic,
        };

        /**
        * Action after click on "CANCEL" or "YES" button.
        * Remove the bitnami box and all child nodes
        */
        window.cancel = function cancel() {
          // If the the user click on "YES" when he is asking for the solution -> He found the solution
          // Generate Solved event when the user found the solution
          if (allData.currentPage === 2) generateEvent('Solved');

          document.documentElement.style.overflow = 'auto';
          if ($('.bitnami-b').length) $('.bitnami-b').remove();
        };

        /**
        * Action after click on "NEW TOPIC" or "BACK (page2)" button.
        * Show welcome message and dropdown lists
        */
        window.goToPage1 = function goToPage1() {
          allData.currentPage = 1;
          const page1 = $.templates('#mainTpl');
          page1.link('.bitnami-b', allData);
        };

        /**
        * Action after click on "NEXT" or "BACK (page3)" button.
        * Show search result according to the introduced data
        */
        window.goToPage2 = function goToPage2() {
          allData.currentPage = 2;
          const page2 = $.templates('#chokepointUsefulLinks');
          page2.link('#bitnamiContainer', allData);
          getUsefulLinks(chokepointMetadata.usefulLinks, chokepointMetadata.topicArray, allData.applicationSelected, allData.topicSelected);
        };

        /**
        * Action after clicking Next in case of Technical issue
        * Ask user for the bnsupport tool code
        */
        window.goToPage3 = function goToPage3() {
          allData.currentPage = 3;
          const page3 = $.templates('#bnsupportPage');
          page3.link('#bitnamiContainer', allData);
        };

        /**
        * Action after providing the bnsupport tool code
        * Validate the string the user provided
        */
        window.validateBnsupport = function validateBnsupport() {
          const bnsupportIDRegex = new RegExp(/[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/);
          if (bnsupportIDRegex.test(allData.bnsupportFilled)) {
            if (allData.platformSelected == 'Installers') {
              goToPage5();
            } else {
              goToPage4();
            }
          } else {
            alert("The ID you provided is not valid");
            goToPage3();
          }
        };

        /**
        * Action after providing the bnsupport tool code
        * Show the user the errors the tool found
        */
        window.goToPage4 = function goToPage4() {
          allData.currentPage = 4;
          const page4 = $.templates('#bndiagnosticPage');
          page4.link('#bitnamiContainer', allData);
          getBndiagnostic(allData.bnsupportFilled);
        };

        /**
        * Action after explaining why the bndiagnostic info was not useful.
        * Show a different textarea asking for information before creating the case
        */
        window.goToPage5 = function goToPage5() {
          allData.currentPage = 5;
          const page6 = $.templates('#explanationCase');
          page6.link('#bitnamiContainer', allData);
        };

        /**
        * Create case using introduced data
        */
        window.create = function create() {
          let body;
          const dataToSend = {
            title: allData.titleFilled,
            typing_duration_msecs: 5000,
          };

          if (!allData.textareaFilled) allData.textareaFilled = 'Description not provided';
          if (allData.typeSelected === 'Technical issue') {
            body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n\n`;
            if (allData.bnsupportFilled) body += `**bnsupport ID:** ${allData.bnsupportFilled}\n\n`;
            if (allData.bndiagnosticOutput) body += `**bndiagnostic output:**\n\`\`\`\n${allData.bndiagnosticOutput}\n\`\`\`\n`;
            if (allData.bndiagnosticReasonFilled) {
              body += `**bndiagnostic failure reason:** ${allData.bndiagnosticReasonFilled}\n\n`;
            } else if (allData.bndiagnosticReasonSelected) {
              body += `**bndiagnostic failure reason:** ${allData.bndiagnosticReasonSelected}\n\n`;
            }
            body += `**Description:**\n ${allData.textareaFilled}`;
            dataToSend.category = _.filter(allData.applicationValues, {application: allData.applicationSelected})[0].id;
            dataToSend.raw = body;
          } else if (allData.typeSelected === 'How to') {
            body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n\n**Description:**\n ${allData.textareaFilled}`;
            dataToSend.category = _.filter(allData.applicationValues, {application: allData.applicationSelected})[0].id;
            dataToSend.raw = body;
          } else if (allData.typeSelected === 'Suggestion' || allData.typeSelected === 'Bitnami Support Tool') {
            body = `**Type:** ${allData.typeSelected}\n\n**Description:**\n ${allData.textareaFilled}`;
            dataToSend.category = _.filter(allData.applicationValues, {application: 'General'})[0].id;
            dataToSend.raw = body;
          }

          // Generate SendPost event before send post message
          generateEvent('SendPost');
          $.post(`${communityURL}/posts`, dataToSend)
            .done(function(data) {
              try {
                const caseURL = `${communityURL}/t/${data.topic_slug}/${data.topic_id}`;
                // Generate Create event when the post returns 200 and the case is created
                generateEvent('Create', caseURL);
                cancel();
                window.location.replace(caseURL);
              } catch (e) {
                // Generate Failure event due to a fail inside done callback
                generateEvent('Failure', `Generate Failure. Done callback - ${e} : ${navigator.userAgent}`);
              }
            })
            .fail(function(xhr) {
              try {
                let text = 'Case not created due to:\n';
                JSON.parse(xhr.responseText).errors.forEach(function(errormsg) {
                  text = text.concat(' - ', errormsg, '\n');
                });
                // Generate Failure event due to a fail in the Discourse tests (title, content, category, etc)
                generateEvent('Failure', `${text} : ${navigator.userAgent}`);
                text = text.concat('\nPlease, fix the issue and try again.');
                alert(text); // eslint-disable-line no-alert
              } catch (e) {
                // Generate Failure event due to a fail inside fail callback
                generateEvent('Failure', `Generate Failure. Fail callback - ${xhr.responseText} - ${e} : ${navigator.userAgent}`);
              }
            });
        };

        /**
        * Action after click on "Go to Bitnami HelpDesk" button.
        * Remove the bitnami box and open HelpDesk new case in a new tab
        */
        window.goToHelpdesk = function goToHelpdesk() {
          window.open('https://helpdesk.bitnami.com/hc/en-us/requests/new', '_blank');
          cancel();
        };

        if (!$('#bitnamiContainer').length) {
          $('#main').append('<div class="bitnami-b"></div>');
          allData.browser = navigator.vendor;
          goToPage1();
        }
        return false;
      } catch (e) {
        // Generate Failure event due to a fail in the JS chokepoint code
        generateEvent('Failure', `Generate Failure event due to a fail in the JS chokepoint code - ${e} : ${navigator.userAgent}`);
        return true;
      }
    }

    NavigationDefaultController.reopen({
      actions: {
        clickCreateTopicButton: chokePoint,
      },
    });

    SearchResultsDefaultController.reopen({
      actions: {
        createTopic: chokePoint,
      },
    });

    /* The ready() method offers a way to run JavaScript code as soon as the
    * page's Document Object Model (DOM) becomes safe to manipulate.
    * This will often be a good time to perform tasks that are needed before
    * the user views or interacts with the page
    */
    $(document).ready(function() {
      $('#create-topic').hide();

      try {
        // Load chokePoint.html (plus chokePoint.css and some JavaScripts included in the HTML)
        $.get('/plugins/bitnami-chokepoint/chokePoint.html')
          .done(function(value) {
            try {
              $('head').append(value);
              // The load event is sent to an element when it and all sub-elements have been completely loaded
              $(window).ready(function() {
                $.get('https://downloads.bitnami.com/files/community/chokepoint.json')
                  .done(function(metadata) {
                    chokepointMetadata = metadata;
                    // Obtains application name dinamically from Discourse categories
                    $.get(`${communityURL}/categories.json`)
                      .done(function(data) {
                        try {
                          data.category_list.categories.forEach(function(category) {
                            if (category.name !== 'Staff') {
                              const object = {};
                              object.application = category.name;
                              object.slug = category.slug;
                              object.id = category.id;
                              applicationArray.push(object);
                            }
                          });
                          applicationArray.sort(propComparator('application'));
                          $('#create-topic').show();
                          showChokePoint = true;
                        } catch (e) {
                          // Error managing categories
                          withoutChokepoint(`Error managing categories - ${e}`);
                        }
                      })
                      .fail(function() {
                        // Error dowloading categories
                        withoutChokepoint('Error downloading categories');
                      });
                  })
                  .fail(function() {
                    // Error dowloading chokepoint.json
                    withoutChokepoint('Error getting chokepoint metadata');
                  });
              });
            } catch (e) {
              // JS error before chokePoint appears
              withoutChokepoint(`JS error before chokePoint appears - ${e}`);
            }
          })
          .fail(function() {
            // Error downloading html
            withoutChokepoint('Error downloading html');
          });
      } catch (e) {
        // Error before chokePoint appears
        withoutChokepoint(`Error before chokePoint appears - ${e}`);
      }
    });
  },
};
