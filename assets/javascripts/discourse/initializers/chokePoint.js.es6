const NavigationDefaultController = require('discourse/controllers/navigation/default').default;
import { ajax } from 'discourse/lib/ajax';

export default {
  name: 'chokepoint',
  initialize: function() {
    $.get('/plugins/bitnami-chokepoint/chokePoint.html', function(value) {
      $('head').append(value);
    });

    NavigationDefaultController.reopen({
      actions: {
        createTopic: function() {
          if (typeof disableChokePoint !== 'undefined' && disableChokePoint) {
            return true;
          }

          // Google analytics variables
          let d;
          let eventDate;
          let info;

          if (!Discourse.User.current().staff) {
            d = new Date();
            eventDate = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}.${d.getUTCMilliseconds()}`;
            info = `[${eventDate}] ${Discourse.User.current().get('username')}`;
            ga('send', 'event', 'SupportCase', 'New', info);
          }

          // Change default delimiters
          $.views.settings.delimiters('[[', ']]', '^');

          // Sort objects element alphabetically
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

          const communityURL = window.location.origin;

          // Obtains application name dinamically from discourse categories
          const applicationArray = [];
          $.get(`${communityURL}/categories.json`)
            .done(function(data) {
              data.category_list.categories.forEach(function(category) {
                if (category.name !== 'Staff' && category.name !== 'General') {
                  const object = {};
                  object.application = category.name;
                  object.slug = category.slug;
                  applicationArray.push(object);
                }
              });
              applicationArray.sort(propComparator('application'));
            });
          const typeArray = [
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
          ];

          const platformArray = [
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
          ];

          const topicArray = [
            {
              topic: 'Email configuration (SMTP)',
              query: 'SMTP OR mail OR email',
            },
            {
              topic: 'Connectivity (SSH/FTP)',
              query: 'SSH OR tunnel OR FTP',
            },
            {
              topic: 'Secure Connections (SSL/HTTPS)',
              query: 'SSL OR tls OR HTTPS',
            },
            {
              topic: 'Permissions',
              query: 'permissions OR plugin OR upload Or install',
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
          ];

          /**
          * Adapt the search string
          */
          window.adaptSearch = function adaptSearch(platform, app, topic) {
            let searchString = '';

            if (topic !== 'Other') {
              const topicQuery = _.filter(topicArray, {topic: topic})[0].query;
              searchString += (`${topicQuery}`);
            }

            if (platform !== 'Other') {
              let platformQuery = platform;
              if (platform !== 'Virtual Machines' && platform !== 'Windows' && platform !== 'OS X' && platform !== 'Linux') {
                platformQuery = _.filter(_.filter(platformArray, {platform: 'Clouds'})[0].subplatforms, {subplatform: platform})[0].query;
              }
              searchString += (` OR ${platformQuery}`);
            }

            if (app !== 'General') {
              searchString += (` OR ${app}`);
            }

            return searchString;
          };

          const allData = {
            typeSelected: null,
            typeValues: typeArray,
            platformSelected: null,
            platformValues: platformArray,
            applicationSelected: null,
            applicationValues: applicationArray,
            topicSelected: null,
            topicValues: topicArray.sort(propComparator('topic')),
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
            if (allData.currentPage === 2) {
              if (!Discourse.User.current().staff) {
                d = new Date();
                eventDate = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}.${d.getUTCMilliseconds()}`;
                info = `[${eventDate}] ${Discourse.User.current().get('username')}`;
                ga('send', 'event', 'SupportCase', 'Solved', info);
              }
            }
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
                    if (!Discourse.User.current().staff) {
                      d = new Date();
                      eventDate = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}.${d.getUTCMilliseconds()}`;
                      info = `[${eventDate}] ${Discourse.User.current().get('username')} : ${search}`;
                      ga('send', 'event', 'SupportCase', 'Search', info);
                    }
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

          window.createZendeskIssue = function createZendeskIssue() {
            console.log('AJAX request');
            ajax('/zendesk-plugin/issues', {
              type: 'POST',
              data: {
                subject: '[TESTING] This is a test',
                comment: 'This is a test',
                submitter_id: 'zendesk@bitnami.com',
              },
            });

            cancel();
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

            if (!allData.textareaFilled) {
              allData.textareaFilled = 'Description not provided';
            }

            if (allData.typeSelected === 'How to' || allData.typeSelected === 'Technical issue') {
              if (allData.bnsupportFilled) {
                body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n**bnsupport ID:** ${allData.bnsupportFilled}\n**Description:**\n ${allData.textareaFilled}`;
              } else {
                body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n**Description:**\n ${allData.textareaFilled}`;
              }
              dataToSend.category = allData.applicationSelected;
              dataToSend.raw = body;
            } else if (allData.typeSelected === 'Suggestion') {
              body = `**Type:** ${allData.typeSelected}\n**Description:**\n ${allData.textareaFilled}`;
              dataToSend.category = 'General';
              dataToSend.raw = body;
            }

            $.post(`${communityURL}/posts`, dataToSend)
              .done(function(data) {
                cancel();
                const caseURL = `${communityURL}/t/${data.topic_slug}/${data.topic_id}`;
                window.location.replace(caseURL);
                if (!Discourse.User.current().staff) {
                  d = new Date();
                  eventDate = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}.${d.getUTCMilliseconds()}`;
                  info = `[${eventDate}] ${Discourse.User.current().get('username')} : ${caseURL}`;
                  ga('send', 'event', 'SupportCase', 'Create', info);
                }
              })
              .fail(function(xhr) {
                let text = 'Case not created due to:';
                JSON.parse(xhr.responseText).errors.forEach(function(errormsg) {
                  text = text.concat('\n\t- ', errormsg);
                });
                text = text.concat('\n\nPlease, fix the issue and try again.');
                alert(text);
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
        },
      },
    });
  },
};
