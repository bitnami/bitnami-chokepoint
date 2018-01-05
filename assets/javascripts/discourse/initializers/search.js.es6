/* eslint-disable max-len */

export default {
  name: 'search',
  initialize: function() {
    /* exported initSearch */
    /* globals $:false, console:false, URLSearchParams */

    /**
    * Add search features to an input using the AddSearch library
    *
    * @see https://www.addsearch.com/support/mobile-customization/can-i-restrict-search-to-area-of-my-site/
    * @param {String} selector The selector of the search box. This HTML element must include an input and a .results div
    * @param {String} token The AddSearch Token
    * @param {Object} options Optional parameters to customize the behaviour of the search. Available
    *    params are:
    *      - filters: These filters will be displayed as a dropdown at the right of
    *        search box. The expected format for the object is the follwing:
    *          [     // Items to display in the filter
    *            {
    *              label: 'Label in the dropdown',
    *              filters: ['filterkey', 'secondfilter']
    *            }
    *          ]
    *      - predefinedFilters: Filters that will be prefilled by default. For example,
    *        you can filter by a domain and section by default. If the dropdown affects the position of an
    *        element, these filters will be overridden.
    *        Ex. ['docs.bitnami.com', 'aws'].
    *      - categoryToShow: This number indicates the category that the lib will and
    *        after the highlighs of the result. If not category is selected, nothing will be displayed.
    *      - inline: Display the results below the next box instead of in a modal.
    *      - onFirstSearch: Callback that will be executed on first search;
    *      - onSearch: Callback when the user search. It's not fired the first time (See onFirstSearch)
    *      - onChangeFilter: Callback that will be executed when the user changes the current filter
    *      - perPage: Results per page
    *      - useHistory: Change the current url using the history API browser
    */
    var initSearch = function(selector, token, options) {
      /**
      * ------------------------
      * INITIALIZE VARIABLES
      * ------------------------
      */
      var predefinedFilters = options.predefinedFilters == null ? [] : options.predefinedFilters; // jshint ignore:line
      var filters = options.filters == null ? [] : options.filters; // jshint ignore:line
      var categoryToShow = options.categoryToShow == null ? -1 : options.categoryToShow; // jshint ignore:line
      var inline = options.inline;
      var perPage = options.perPage == null ? 10 : parseInt(options.perPage, 10);
      var useHistory = options.useHistory == null ? true : options.useHistory;

      if (!token || typeof token !== 'string' || token === '') {
        console.error('The token of AddSearch must not be empty');
        return;
      }

      // Store the current search to load more pages.
      var currentSearch = '';
      var currentResult = {};
      var currentEnd = false;
      var firstSearch = true;

      // Query params
      var queryString = window.location.search;
      var queryParams = new URLSearchParams(queryString);

      // Set the current page (for inline elements that not use infinite scrolling!)
      var initialPage = 1;
      if (queryParams.has('page')) {
        var queryPage = parseInt(queryParams.get('page'), 10);
        initialPage = queryPage > 0 ? queryPage : 1;
      }

      // Set the current page
      var currentPage = initialPage;

      // Filters
      var selectedFilter = 0;

      if (queryParams.has('filter')) {
        var queryFilter = parseInt(queryParams.get('filter'), 10);
        selectedFilter = queryFilter >= 0 ? queryFilter : 0;
      } else if (filters.length > 0) {
        for (var i = 0; i < filters.length; i += 1) {
          if (filters[i].default === true) {
            selectedFilter = i;
            break;
          }
        }
      }

      // Selectors
      var $selector = $(selector);
      var $input = $selector.find('input');
      var $results = $selector.find('.search__results');

      // Set the overlay class if it's required
      if (!inline) {
        $selector.addClass('search-overlay');
      }

      /**
      * ------------------------
      * METHODS OF THE LIB
      * ------------------------
      */

      /**
      * Delay the current function to avoid a huge amount of requests
      */
      var delay = (function() {
        var timer = 0;
        return function(callback, ms) {
          clearTimeout(timer);
          timer = setTimeout(callback, ms);
        };
      }());

      /**
      * Format the filters for the API requests. For example:
      * ['docs.bitnami.com', 'aws'] => '0xdocs.bitnami.com/1xaws'
      *
      * @see https://www.addsearch.com/support/mobile-customization/can-i-restrict-search-to-area-of-my-site/
      * @return {String} Formatted filters to send to the API
      */
      function formatFilters() {
        var format = [];
        var connector = '/';

        for (var i = 0; i < predefinedFilters.length; i += 1) {
          format.push(i + 'x' + predefinedFilters[i]);
        }

        // Dropdown filters can override predefined filters
        if (filters.length > 0 && filters[selectedFilter].filters.length > 0) {
          var filtersToApply = filters[selectedFilter].filters;
          var l = filtersToApply.length;

          for (var j = 0; j < l; j += 1) {
            if (filtersToApply[j] !== '' && filtersToApply[j] != null) { // jshint ignore:line
              format[j] = j + 'x' + filtersToApply[j];
            } else {
              // If we have some empty element in the middle, we cannot use the exact
              // path connector (/)
              // @see https://www.addsearch.com/support/mobile-customization/can-i-restrict-search-to-area-of-my-site/
              connector = ',';
            }
          }
        }

        return 'categories=' + format.join(connector);
      }

      /**
      * Display the category of the result after the highlight
      */
      function displayCategory(result) {
        if (categoryToShow === -1) { return ''; }

        var label = result.categories[categoryToShow];

        if (label != null) { // jshint ignore:line
          return '<span class="tag tag-small">' +
          label.replace(/^(\d)+x/, '') +
          '</span>';
        }
        return '';
      }

      /**
      * Generate the HTML code of a result
      */
      function resultCard(hit, url, position) {
        return '' +
        '<div class="search__results__result">' +
        '<h4 class="margin-t-normal type-bold"><a data-position="' + position + '" href="' + url + '" target="_blank"> ' + hit.title + '</a> ' +
        displayCategory(hit) + '</h4>' +
        '<p class="margin-b-normal">' + hit.highlight + '...</p>' +
        '</div>';
      }

      /**
      * Search the value in AddSearch and update the result box
      */
      function loadResults(value, page, clean, scroll) {
        var encodedQuery = encodeURIComponent(value);
        var encodedPage = typeof page === 'number' ? page : 1;
        var query = 'term=' + encodedQuery + '&page=' + encodedPage + '&limit=' + perPage +  '&' + formatFilters();

        // Update page
        currentPage = page;

        // Display loading
        if ($results.children().length === 0) {
          $results.append('<p class="text-c margin-t-enormous">Loading results...</p>');
        }

        $.get('https://api.addsearch.com/v1/search/' + token + '?' + query)
          .done(function(data) {
            // Store last data
            currentResult = data;

            // Clean if it's required
            if (clean) {
              $results.empty();
              $results.append('<p id="numberOfResults" class="margin-v-small">' + data.total_hits + ' Results</p>');
            }

            if (scroll) {
              $results.scrollTop(0);
            }

            if (data.hits.length > 0) {
              data.hits.forEach(function(hit, i) {
                // Remove the anchor. It redirects to the wrong section
                var url = hit.url.split('#')[0];
                var position = perPage * (currentPage-1) + i + 1;
                $results.append(resultCard(hit, url, position));
              });

              if (data.hits.length < 10) {
                currentEnd = true;
              }
            } else if (page === 1) {
              $results.append('<p class="text-c marign-t-big margin-t-enormous">' +
              'We didn\'t find any result for <b>"' + value + '"</b>. ' +
              'You can try with a less specific search.</p>');
            }

            if (inline) {
              buildPagination(page, data.total_hits);
            }
          })
          .fail(function() {
            // TODO: Send a exception to airbrake?
            $results.append('<p class="text-c marign-t-big margin-t-enormous">' +
              'Sorry, there was an error with the Search Service. Please, reload the page. ' +
              'If the problem persists, please notify us in ' +
              '<a href="/support">Bitnami Support.</a>' +
              '</p>');
          })
          .always(function() {
            $results.removeClass('search__results-loading');
          });
      }

      /**
      * Build the UI of filters dropdown
      */
      function buildFilters() {
        if (filters.length === 0) { return; }

        var currentFilter = filters[selectedFilter];
        var htmlFilters =
        '<button class="button button-dropdown" aria-haspopup="true">' +
        currentFilter.label +
        '</button>';

        // Start the list
        htmlFilters +=
        '<ul class="dropdown__list remove-style elevation-1 slide-in margin-t-normal" aria-hidden="true" ' +
        'aria-label="submenu">';

        // Iterate over filters
        for (var i = 0; i < filters.length; i += 1) {
          if (i !== selectedFilter) {
            htmlFilters += '<li class="search__filter" data-item="' + i + '">' +
            '<a>' + filters[i].label + '</a>' +
            '</li>';
          }
        }

        // Close ul
        htmlFilters += '</ul>';

        // Clean and add the filters
        $selector.find('.filters').empty()
          .append(htmlFilters);
      }

      // Event handler for the click
      function clickHandler($e) {
        var $target = $($e.target);
        if (!$target.is('.search__filter a') && !$target.is($selector.find('*'))) {
          hideSearch();
        }
      }

      /**
      * Hide search and remove document bindings
      */
      function hideSearch() {
        // Disable binding to improve the performance
        $(document).off('click', '', clickHandler);
        $(document).off('keyup');
        $input.val('');
        $results.fadeOut(100);
      }

      /**
      * Build the Search URL based on search, page and filter
      */
      function buildUrl(search, filter, page) {
        return window.location.pathname + '?q=' + search + '&filter=' + filter + '&page=' + page;
      }

      /**
      * Build a pagination item HTML
      */
      function buildPaginationItem(content, page, current) {
        if (current) {
          return '<li class="pagination__current">' +
          '<a aria-current="true" ' +
          'aria-label="Current Page, Page ' + page + '">' + content + '</a>' +
          '</li>';
        }
        var nextUrl = buildUrl(currentSearch, selectedFilter, page);
        return '<li>' +
        '<span data-href="' + nextUrl + '" aria-label="Goto Page ' + page + '" data-page="' + page + '">' +
        content + '</span>' +
        '</li>';
      }

      /**
      * Build pagination
      */
      function buildPagination(current, total) {
        var items = [];
        var totalPages = Math.ceil(total / perPage) + 1;

        // Display x-2 x-1 x x+1 x+2 where x is the current page
        var i = current <= 3 ? 1 : current - 2;
        var max = current + 3 > totalPages ? totalPages : current + 3;

        for (i; i < max; i += 1) {
          var item = '';

          if (i === current) {
            item = buildPaginationItem(i, i, true);
          } else {
            item = buildPaginationItem(i, i, false);
          }

          items.push(item);
        }

        if (current > 3) {
          var prevPage = current - 3;
          items.unshift(buildPaginationItem('<', prevPage, false));
          items.unshift(buildPaginationItem('<<', 1, false));
        }

        if (current + 3 < totalPages) {
          var nextPage = current + 3;
          items.push(buildPaginationItem('>', nextPage, false));
          items.push(buildPaginationItem('>>', totalPages - 1, false));
        }

        $results.append('' +
        '<nav class="pagination" ' +
        'role="navigation" aria-label="Pagination Navigation">' +
        '<ul class="remove-style margin-b-reset">' +
        items.join('') +
        '</ul>' +
        '</nav>');
      }

      /**
      * ------------------------
      * INITIALIZE THE SEARCH BOX
      * ------------------------
      */

      // Display the filter in the UI if they're present
      buildFilters();

      $selector.find('input[type="search"]').on('input', function($e) {
        delay(function() {
          // Store the current Search to paginate
          currentSearch = $e.target.value;
          // Load new results
          if ($e.target.value && $e.target.value !== '') {
            $results.fadeIn(100);
            currentEnd = false;

            if (firstSearch && typeof options.onFirstSearch === 'function') {
              options.onFirstSearch(currentSearch);
            } else if (typeof options.onSearch === 'function') {
              options.onSearch(currentSearch);
            }

            // Disable firstSearch
            firstSearch = false;

            if (!inline) {
              // Bind onclick event for the document
              $(document).on('click', clickHandler);

              // Hide the search if the user clicks on ESC
              $(document).on('keyup', function($esc) {
                if ($esc.keyCode === 27) {
                  hideSearch();
                }
              });
            }

            // Load the first results
            loadResults($e.target.value, initialPage, true, true);
          } else if (!inline) {
            hideSearch();
          }
        }, 200);
      });

      if (inline) {
        // Handle the click on pagination
        $(document).on('click', selector + ' .pagination span', function(e) {
          e.preventDefault();
          var $this = $(this);
          var page = parseInt($this.data('page'), 10);

          if (!$this.data('page') || page === currentPage) { return; }

          // Update the URL
          if (useHistory === true) {
            var url = buildUrl(currentSearch, selectedFilter, page);
            // Push a new state to the browser to disable reloading the page
            window.history.pushState(
              {q: currentSearch, page: page, filter: selectedFilter},
              'Bitnami Search',
              url
            );
          }

          // Change opacity of the results
          $results.addClass('search__results-loading');

          // Load the results
          loadResults(currentSearch, page, true, true);
        });
      } else {
        // Handle scrolling in the SearchBox to load more results
        $results.on('scroll', function() {
          if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
            if (!currentEnd) {
              loadResults(currentSearch, currentResult.page + 1, false, false);
            }
          }
        });
      }

      // Handle the click on the filters
      $(document).on('click', selector + ' .search__filter', function(e) {
        e.preventDefault();
        selectedFilter = parseInt($(this).data('item'), 10);
        buildFilters();

        // Update the URL
        if (useHistory === true) {
          var url = buildUrl(currentSearch, selectedFilter, currentPage);
          // Push a new state to the browser to disable reloading the page
          window.history.replaceState(
            {q: currentSearch, page: currentPage, filter: selectedFilter},
            'Bitnami Search',
            url
          );
        }

        if (typeof options.onChangeFilter === 'function') {
          options.onChangeFilter(filters[selectedFilter].label);
        }

        // Change opacity of the results
        $results.addClass('search__results-loading');

        // Load the results
        loadResults(currentSearch, 1, true, true);
      });

      $(document).off('click', '.search__results__result a').on('click', '.search__results__result a', function() {
        const d = new Date();
        const info = `[${d.getUTCFullYear()}/${d.getUTCMonth()+1}/${d.getUTCDate()}] ${Discourse.User.current().get('username')} : ${currentSearch} : ${$(this).attr('data-position')} : ${$(this).attr('href')}`;
        if (!Discourse.User.current().staff) {
          ga('send', 'event', 'SupportCase', 'SearchResult', info);
        } else {
          console.log(info);
        }
      });

      // Check if the form already are prefilled
      if ($input.val() !== '') {
        $selector.find('input[type="search"]').trigger('input');
      }
    };

    window.initSearch = initSearch;
  },
};
