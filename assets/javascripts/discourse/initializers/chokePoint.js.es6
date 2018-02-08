const NavigationDefaultController = require('discourse/controllers/navigation/default').default;

export default {
  name: 'chokepoint',
  initialize: function() {
    const version = 'v1.0.1';
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
          type: 'Suggestion',
        },
        {
          type: 'Sales & Account',
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
              subplatform: 'Amazon Web Services',
              query: 'AWS OR Amazon',
            },
            {
              subplatform: 'Microsoft Azure',
              query: 'Azure OR Microsoft',
            },
            {
              subplatform: 'Oracle Cloud Platform',
              query: 'Oracle',
            },
            {
              subplatform: 'Century Link',
              query: 'CenturyLink',
            },
            {
              subplatform: '1&1',
              query: '1and1',
            },
            {
              subplatform: 'Huawei Cloud',
              query: 'Huawei',
            },
            {
              subplatform: 'Open Telekom Cloud',
              query: 'Telekom',
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
              subplatform: 'Linux',
            },
          ],
        },
        {
          platform: 'Containers',
        },
        {
          platform: 'Other',
        },
      ],
      topicArray: [
        {
          topic: 'Email configuration (SMTP)',
          query: 'SMTP OR mail OR email OR Troubleshoot',
        },
        {
          topic: 'Connectivity (SSH/FTP)',
          query: 'SSH OR tunnel OR FTP OR Troubleshoot',
        },
        {
          topic: 'Secure Connections (SSL/HTTPS)',
          query: 'SSL OR tls OR HTTPS OR Troubleshoot',
        },
        {
          topic: 'Permissions',
          query: 'permissions OR plugin OR upload Or install OR Troubleshoot',
        },
        {
          topic: 'Credentials',
          query: 'login OR credentials OR password OR frequently',
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
    };

    /**
    * Sort objects element alphabetically
    * @param  {String} prop Property to compare
    */
    function propComparator(prop) {
      return function(a, b) {
        if (a[prop] > b[prop]) {
          return 1;
        } else if (a[prop] < b[prop]) {
          return -1;
        }
        return 0;
      };
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
        let info = `[${date}] ${version} ${Discourse.User.current().get('username')}`;
        if (extraInfo) info += ` : ${extraInfo}`;

        if (!Discourse.User.current().staff) {
          ga('send', 'event', 'SupportCase', type, info);
        } else {
          console.log(type, info);
        }
      } catch (e) {
        const d = new Date();
        const date = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        const info = `[${date}] ${version} ${Discourse.User.current().get('username')} ${e} ${navigator.userAgent}`;
        if (!Discourse.User.current().staff) {
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
          return true;
        }
        // Generate New event when click on New Topic
        generateEvent('New');

        // Change default delimiters
        $.views.settings.delimiters('[[', ']]', '^');

        /**
        * Adapt the search string
        */
        window.adaptSearch = function adaptSearch(platform, app, topic) {
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
          if (app === 'WordPress Multisite' || app === 'WordPress + NGINX + SSL') appQuery = 'WordPress';

          searchString = topicQuery;

          if (searchString) {
            if (platformQuery) searchString += ` OR ${platformQuery}`;
          } else {
            searchString += `${platformQuery}`;
          }

          if (searchString) {
            if (appQuery) searchString += ` OR ${appQuery}`;
          } else {
            searchString += `${appQuery}`;
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
          textareaFilled: null,
          currentPage: 1,
          adaptSearch: adaptSearch,
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
          const page2 = $.templates('#search');
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
        * Action after click on "NO" button.
        * Show different textarea asking for information before creating the case
        */
        window.goToPage3 = function goToPage3() {
          allData.currentPage = 3;
          const page3 = $.templates('#explanationCase');
          page3.link('#bitnamiContainer', allData);
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

          if (allData.typeSelected === 'How to' || allData.typeSelected === 'Technical issue') {
            body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ` +
                   `${allData.typeSelected} - ${allData.topicSelected}\n`;
            if (allData.bnsupportFilled) body += `**bnsupport ID:** ${allData.bnsupportFilled}\n`;
            body += `**Description:**\n ${allData.textareaFilled}`;

            dataToSend.category = allData.applicationSelected;
            dataToSend.raw = body;
          } else if (allData.typeSelected === 'Suggestion') {
            body = `**Type:** ${allData.typeSelected}\n**Description:**\n ${allData.textareaFilled}`;
            dataToSend.category = 'General';
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
                generateEvent('Failure', `${e} : ${navigator.userAgent}`);
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
                alert(text);
              } catch (e) {
                // Generate Failure event due to a fail inside fail callback
                generateEvent('Failure', `${e} : ${navigator.userAgent}`);
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
        generateEvent('Failure', `${e} : ${navigator.userAgent}`);
        return true;
      }
    }

    NavigationDefaultController.reopen({
      actions: {
        createTopic: chokePoint,
      },
    });

    if (typeof disableChokePoint === 'undefined' || !disableChokePoint) {
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
                $(window).on('load', function() {
                  // Obtains application name dinamically from Discourse categories
                  $.get(`${communityURL}/categories.json`)
                    .done(function(data) {
                      try {
                        data.category_list.categories.forEach(function(category) {
                          if (category.name !== 'Staff' && category.name !== 'General') {
                            const object = {};
                            object.application = category.name;
                            object.slug = category.slug;
                            applicationArray.push(object);
                          }
                        });
                        applicationArray.sort(propComparator('application'));
                        $('#create-topic').show();
                        showChokePoint = true;
                      } catch (e) {
                        // Error managing categories
                        withoutChokepoint(e);
                      }
                    })
                    .fail(function() {
                      // Error dowloading categories
                      withoutChokepoint('Error downloading categories');
                    });
                });
              } catch (e) {
                // JS error before chokePoint appears
                withoutChokepoint(e);
              }
            })
            .fail(function() {
              // Error downloading html
              withoutChokepoint('Error downloading html');
            });
        } catch (e) {
          // Error before chokePoint appears
          withoutChokepoint(e);
        }
      });
    }
  },
};
