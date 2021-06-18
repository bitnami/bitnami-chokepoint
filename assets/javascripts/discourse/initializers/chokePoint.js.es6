const NavigationDefaultController = require('discourse/components/d-navigation').default;
const SearchResultsDefaultController = require('discourse/controllers/full-page-search').default;

export default {
  name: 'chokepoint',
  initialize: function() {
    const version = 'v1.1.0';
    let showChokePoint = false;
    const applicationArray = [];
    const communityURL = window.location.origin;
    const dropdownData = {
      typeArray: [
        {
          type: 'How to',
        },
        {
          type: 'Technical issue',
        },
        {
          type: 'Bitnami Support Tool',
        },
        {
          type: 'Suggestion',
        },
      ],
      platformArray: [
        {
          platform: 'Clouds',
          subplatforms: [
            {
              subplatform: 'Google Cloud Platform',
              query: 'Google',
            },
            {
              subplatform: 'AWS',
              query: 'AWS',
            },
            {
              subplatform: 'Microsoft Azure',
              query: 'Azure',
            },
            {
              subplatform: 'VMware Marketplace',
              query: 'VMware',
            },
            {
              subplatform: 'Bitnami Cloud Hosting',
              query: 'Bitnami Cloud Hosting',
            },
          ],
        },
        {
          platform: 'Virtual Machines',
        },
        {
          platform: 'Installers',
          subplatforms: [
            {
              subplatform: 'Windows',
            },
            {
              subplatform: 'OS X',
            },
            {
              subplatform: 'OS X VM',
            },
            {
              subplatform: 'Linux',
            },
          ],
        },
        {
          platform: 'Containers',
        },
        {
          platform: 'Charts',
        },
      ],
      topicArray: [
        {
          topic: 'Email configuration (SMTP)',
          query: 'SMTP OR mail OR Troubleshoot',
        },
        {
          topic: 'Connectivity (SSH/FTP)',
          query: 'SSH OR FTP OR Troubleshoot',
        },
        {
          topic: 'Secure Connections (SSL/HTTPS)',
          query: 'SSL OR HTTPS OR Troubleshoot',
        },
        {
          topic: 'Permissions',
          query: 'permissions OR plugin OR Troubleshoot',
        },
        {
          topic: 'Credentials',
          query: 'login OR credentials OR password',
        },
        {
          topic: 'Domain Name (DNS)',
          query: 'DNS OR domain',
        },
        {
          topic: 'Upgrade',
          query: 'upgrade OR update OR migrate',
        },
      ],
      bndiagnosticReasonsArray: [
        {
          bndiagnosticReason: 'The documentation didn\'t make any significant change',
        },
        {
          bndiagnosticReason: 'I do not know how to perform the changes explained in the documentation',
        },
        {
          bndiagnosticReason: 'The suggested guides are not related with my issue',
        },
        {
          bndiagnosticReason: 'Other',
        },
      ],
    };

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
        * Get the bndiagnostic information
        */
        window.getBndiagnostic = function getBndiagnostic(bnsupport) {
          $('.bndiagnostic__results').empty();
          $('.bndiagnostic__results').append(`<pre class="bndiagnostic__text">Loading results...</pre>`);
          let endpointURL;
          if (/community.bitnami.com/.test(window.location.host)) {
            endpointURL="http://internal-bndiagnostic-retrieval-1263868043.us-east-1.elb.amazonaws.com"
          } else {
            endpointURL="http://internal-bndiagnostic-retrieval-dev-1996126494.us-east-1.elb.amazonaws.com"
          }

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
              $('.bndiagnostic__results').append(`<pre class="bndiagnostic__text">Couldn't obtain data or data is outdated. Please update the Bitnami Support Tool to the latest version and run it again

<a href="${bnsupportURL}" target="_blank">${bnsupportURL}</a>
</pre>`);
            })
        }

        /**
        * Adapt the search string
        */
        window.adaptSearch = function adaptSearch(platform, app, topic) {
          const limitSearch = 10;
          let searchString = '';
          let topicQuery = '';
          let platformQuery = '';
          let appQuery = '';

          if (topic !== 'Other') topicQuery = _.filter(dropdownData.topicArray, {topic: topic})[0].query;

          if (platform !== 'Other') {
            // It returns index of the value in array and -1 if value is not present in array
            if ($.inArray(platform, ['Virtual Machines', 'Windows', 'OS X', 'Linux']) === -1) {
              platformQuery = _.filter(_.filter(dropdownData.platformArray, {platform: 'Clouds'})[0]
                .subplatforms, {subplatform: platform})[0].query;
            } else {
              platformQuery = platform;
            }
          }

          if (app !== 'General') appQuery = app;

          if (app === 'WordPress + NGINX + SSL') {
            appQuery = 'WordPress NGINX';
          }

          searchString = appQuery;

          if (searchString) {
            if (platformQuery) searchString += ` OR ${platformQuery}`;
          } else {
            searchString += `${platformQuery}`;
          }

          if (searchString) {
            if (topicQuery) searchString += ` OR ${topicQuery}`;
          } else {
            searchString += `${topicQuery}`;
          }

          // If there are more than limitSearch terms in the request, we limit the search
          if (searchString.split(' ').length > limitSearch) {
            searchString = searchString.split(' ').slice(0, limitSearch);
            if (searchString[limitSearch - 1] === 'OR' || searchString[limitSearch - 1] === 'or') searchString.pop();
            searchString = searchString.join(' ');
          }

          return searchString;
        };

        const allData = {
          typeSelected: null,
          typeValues: dropdownData.typeArray,
          platformSelected: null,
          platformValues: dropdownData.platformArray,
          applicationSelected: null,
          applicationValues: applicationArray,
          topicSelected: null,
          topicValues: dropdownData.topicArray.sort(propComparator('topic')),
          titleFilled: null,
          bnsupportFilled: null,
          bndiagnosticOutput: null,
          bndiagnosticReasonsValues: dropdownData.bndiagnosticReasonsArray,
          bndiagnosticReasonSelected: null,
          bndiagnosticReasonFilled: null,
          textareaFilled: null,
          textareaSanitized: null,
          currentPage: 1,
          createTopic: 1,
          adaptSearch: adaptSearch,
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
          const page2 = $.templates('#chokePointSearch');
          page2.link('#bitnamiContainer', allData);

          /**
          * Delay the current function to avoid a huge amount of requests
          */
          const delay = (function() {
            let timer = 0;
            return function(callback, ms) {
              clearTimeout(timer);
              timer = setTimeout(callback, ms);
            };
          }());

          initSearch(
            '.search',
            'f04d497ee402aea402aed71219175b9a',
            {
              filters: [
                {
                  label: 'All Bitnami sites',
                  filters: [],
                  default: true,
                },
                {
                  label: 'FAQ',
                  filters: ['docs.bitami.com', '', 'faq'],
                },
                {
                  label: 'How-To Guides',
                  filters: ['docs.bitami.com', '', 'how-to'],
                },
                {
                  label: 'Support Forums',
                  filters: ['community.bitnami.com'],
                },
                {
                  label: 'Documentation',
                  filters: ['docs.bitnami.com'],
                },
              ],
              inline: true,
              predefinedFilters: [],
              categoryToShow: 0,
              perPage: 4,
              useHistory: false,
              onSearch: function(search) {
                delay(function() {
                  // Generate Search event when the user modify the search box (also the first time)
                  generateEvent('Search', search);
                }, 2500);
              },
            }
          );

          $('.dropdown').on('click', function() {
            const $this = $(this);

            if ($this.hasClass('dropdown-open')) {
              $this.removeClass('dropdown-open');
              $this.find('.button-dropdown').removeClass('button-dropdown-open');
              $this.find('.dropdown__list').attr('aria-hidden', true);
            } else {
              $this.addClass('dropdown-open');
              $this.find('.button-dropdown').addClass('button-dropdown-open');
              $this.find('.dropdown__list').attr('aria-hidden', false);
            }
          });
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
            if (allData.platformSelected == 'Windows' ||
              allData.platformSelected == 'OS X' ||
              allData.platformSelected == 'Linux') {
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
        * Show different textarea asking for information before creating the case
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
            if (allData.bndiagnosticOutput) body += `**bndiagnostic output:**\n\`\`\`
            ${allData.bndiagnosticOutput}\n\`\`\`\n`;
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
