/* eslint-disable max-len */
const NavigationDefaultController = require('discourse/controllers/navigation/default').default;

export default {
  name: 'chokepoint',
  initialize: function() {
    $.get('/plugins/bitnami-chokepoint/chokePoint.html', function(value) {
      $('head').append(value);
    });

    NavigationDefaultController.reopen({
      actions: {
        createTopic: function() {

          if (disableChokePoint) {
            return true;
          }

          let info = `${Discourse.User.current().get('username')}`;
          ga('send', 'event', 'SupportCase', 'New', info);

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
          // TODO: Check application before show next select
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
              subtype: true,
              subplatforms: [
                {
                  subplatform: 'Google Cloud Platform',
                },
                {
                  subplatform: 'Amazon Web Services',
                },
                {
                  subplatform: 'Microsoft Azure',
                },
                {
                  subplatform: 'Oracle Cloud Platform',
                },
                {
                  subplatform: 'Century Link',
                },
                {
                  subplatform: '1&1',
                },
                {
                  subplatform: 'Open Telekom Cloud',
                },
              ],
            },
            {
              platform: 'Virtual Machines',
              subtype: false,
            },
            {
              platform: 'Installers',
              subtype: true,
              subplatforms: [
                {
                  subplatform: 'Windows Installer',
                },
                {
                  subplatform: 'OS X Installer',
                },
                {
                  subplatform: 'Linux Installer',
                },
              ],
            },
            {
              platform: 'Containers',
              subtype: false,
            },
            {
              platform: 'Other',
              subtype: false,
            },
          ];

          const topicArray = [
            {
              topic: 'SMTP',
            },
            {
              topic: 'Connectivity',
            },
            {
              topic: 'SSL/HTTPS',
            },
            {
              topic: 'Permissions',
            },
            {
              topic: 'Credentials',
            },
            {
              topic: 'DNS',
            },
            {
              topic: 'Upgrade',
            },
          ];

          const allData = {
            typeSelected: null,
            typeValues: typeArray.sort(propComparator('type')),
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
          };

          /**
          * Action after click on "CANCEL" or "YES" button.
          * Remove the bitnami box and all child nodes
          */
          window.cancel = function cancel() {
            // If the the user click on "YES" when he is asking for the solution -> He found the solution
            if (allData.currentPage === 2) {
              info = `${Discourse.User.current().get('username')}`;
              ga('send', 'event', 'SupportCase', 'Solved', info);
            }
            document.documentElement.style.overflow='auto';
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
                    info = `${Discourse.User.current().get('username')} : ${search}`;
                    ga('send', 'event', 'SupportCase', 'Search', info);
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
            // TODO: Fix scroll
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
            };
            if (allData.typeSelected === 'How to' || allData.typeSelected === 'Technical issue') {
              if (allData.bnsupportFilled) {
                body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n**bnsupport ID:** ${allData.bnsupportFilled}\n**Data:**\n ${allData.textareaFilled}`;
              } else {
                body = `**Keywords:** ${allData.applicationSelected} - ${allData.platformSelected} - ${allData.typeSelected} - ${allData.topicSelected}\n**Data:**\n ${allData.textareaFilled}`;
              }
              dataToSend.category = allData.applicationSelected;
              dataToSend.raw = body;
            } else if (allData.typeSelected === 'Suggestion') {
              body = `**Type:** ${allData.typeSelected}\n**Data:**\n ${allData.textareaFilled}`;
              dataToSend.category = 'General';
              dataToSend.raw = body;
            }

            $.post(`${communityURL}/posts`, dataToSend)
              .done(function(data) {
                cancel();
                const caseURL = `${communityURL}/t/${data.topic_slug}/${data.topic_id}`;
                window.location.replace(caseURL);
                info = `${Discourse.User.current().get('username')} : ${caseURL}`;
                ga('send', 'event', 'SupportCase', 'Create', info);
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
