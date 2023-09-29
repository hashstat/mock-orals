(function () {
    function valueOf(node) {
        return node.val() || node.prop('placeholder');
    }


    function setDefault(node, value) {
        node.prop('placeholder', value);
    }


    function formValid(valid) {
        if (valid == undefined) {
            valid = !$('.has-error').length;
        }
        $('#generate').prop('disabled', !valid);
    }


    function speechRateChanged() {
        let min_wpm = Number(valueOf($('#min_wpm'))),
            max_wpm = Number(valueOf($('#max_wpm')));
        if (isNaN(min_wpm) || isNaN(max_wpm) || min_wpm > max_wpm) {
            $('#speech_rate_group').addClass('has-error');
            formValid(false);
        } else {
            $('#speech_rate_group').removeClass('has-error');
            formValid();
        }
    }


    $(document).ready(function () {
        $('#division').change(function () {
            let division = $(this), min_wpm, max_wpm, max_words;
            switch (division.val()) {
                case 'Senior':
                    min_wpm = 125;
                    max_wpm = 140;
                    max_words = 350;
                    break;
                case 'Junior':
                    min_wpm = 115;
                    max_wpm = 130;
                    max_words = 300;
                    break;
                case 'Primary':
                    min_wpm = 100;
                    max_wpm = 115;
                    max_words = 250;
                    break;
                default:
                    division.addClass('has-error');
                    formValid(false);
                    return;
            }
            setDefault($('#min_wpm'), min_wpm);
            setDefault($('#max_wpm'), max_wpm);
            setDefault($('#max_words'), max_words);
            formValid();
        });

        $('#min_wpm').change(speechRateChanged);
        $('#max_wpm').change(speechRateChanged);

        $('#max_words').change(function () {
            let max_words = Number(valueOf($(this)));
            if (isNaN(max_words) || max_words < 1) {
                $('#max_words_group').addClass('has-error');
                formValid(false);
            } else {
                $('#max_words_group').removeClass('has-error');
                formValid();
            }
        });

        $('.form-control').trigger('change');

        $('#generate').click(function () {
            this.disabled = true;
            generatePassages();
        });
    });


    function generatePassages() {
        let version = $('#version').val(),
            division = $('#division').val();

        $.ajax({
            dataType: 'json',
            url: `2023/${division.toLowerCase()}-${version.toLowerCase()}.json`,
        }).done(function (passages) {
            console.log(`received ${passages.length} passages`);
            let max_words = Number(valueOf($('#max_words')));
            if (!isNaN(max_words)) {
                passages = passages.filter(passage => (passage.word_count <= max_words));
                console.log(`${passages.length} passages remaining after filtering those with greater than ${max_words} words`);
            }

            let min_wpm = Number(valueOf($('#min_wpm'))),
                max_wpm = Number(valueOf($('#max_wpm'))),
                attempt, words, wpm;
            for (attempt = 0; attempt < 1000000; attempt++) {
                // TODO Limit the number of attempts to prevent a run-away script
                //      Maybe attempt to do a feasibility test beforehand
                let picked = pick(passages, 12);
                words = picked.reduce((total, p) => (total + p.word_count), 0);
                wpm = words / 8;
                if (min_wpm <= wpm && wpm <= max_wpm) {
                    console.log(`words = ${words}, wpm = ${wpm}`)
                    passages = picked;
                    break;
                }
            }
            if (attempt >= 1000000) {
                $('#passages').html($('<span class="text-danger">Maximum attempts reached. Please adjust parameters and try again.</span>'));
                $('#generate').prop('disabled', false);
                return;
            }

            let container = $('#passages').html($(`<h2>${division} &mdash; ${version}</h2><h4>${words} words (${Math.round(wpm)} words per minute)</h4>`));
            passages.forEach(function (passage, i) {
                container.append(
                    $('<div class="passage"></div>').append(
                        $('<div class="reference-top"></div>').append(
                            $('<span></span>').text(passage.reference),
                            $(`<span class="number">${i + 1}</span>`)),
                        $('<p></p>').append(passage.cards.join(' ').replace(/\(\s*(\d+)\s*\)/g, '<dfn>($1)</dfn>')),
                        $('<div class="reference-bottom"></div>').append(
                            $('<span></span>').text(passage.reference),
                            $('<a href="javascript:void(0)">start over</a>').click(clearErrors))
                    ).click(selectWord)
                );
            });
        }).fail(function (request, status, error) {
            $('#passages').html($('<span class="text-danger"></span>').text(`${status}: ${error}`));
        }).always(function () {
            $('#generate').prop('disabled', false);
        });
    }


    function pick(items, count) {
        let indices = Array.from(items, (_, i) => i),
            chosen = [];
        while (indices.length && chosen.length < count) {
            let i = Math.floor(Math.random() * indices.length);
            chosen.push(items[indices.splice(i, 1)[0]]);
        }
        return chosen;
    }


    function clearErrors(e) {
        $(e.target).closest('.passage').find('.has-error').removeClass('has-error');
    }


    function selectWord(e) {
        let sel = undefined;
        if (e.target.nodeName == 'SPAN') {
            $(e.target).toggleClass('has-error');
            return;
        } else if (e.target.nodeName == 'DFN') {
            sel = window.getSelection();
            let node = e.target.nextSibling;
            sel.collapse(node, 0);
            for ( ; node.nextSibling != null; node = node.nextSibling) {
                if (node.nodeName == 'DFN')
                    break;
            }
            if (node.nodeName == 'SUP')
                sel.extend(node);
            else
                sel.extend(node, node.length);
        } if (e.target.nodeName == 'P') {
            sel = window.getSelection();
            let range = sel.getRangeAt(sel.rangeCount - 1);
            sel.collapseToStart();
            sel.modify('move', 'forward', 'character')
            sel.modify('move', 'backward', 'word')
            sel.extend(range.endContainer, range.endOffset);
            sel.modify('extend', 'backward', 'character')
            sel.modify('extend', 'forward', 'word');
        }
        if (sel === undefined)
            return;

        let replacements = [];
        for (let i = 0; i < sel.rangeCount; i++) {
            range = sel.getRangeAt(i);
            let nodes = [];
            for (let node = range.startContainer; node !== null && node !== range.endContainer.nextSibling; node = node.nextSibling) {
                if (node.nodeName === '#text') {
                    let start = node === range.startContainer ? range.startOffset : 0;
                    let end = node === range.endContainer ? range.endOffset : node.data.length;
                    let text = node.data.slice(start, end);
                    let parts = text.split(/\b/);
                    let nodes = parts.map(function(part) {
                        if (part.match(/^\w/))
                            return $('<span class="has-error"></span>').text(part)[0];
                        return document.createTextNode(part);
                    });
                    if (start)
                        nodes.unshift(document.createTextNode(node.data.substr(0, start)));
                    if (end < node.data.length)
                        nodes.push(document.createTextNode(node.data.substr(end)));
                    replacements.push(function() { node.replaceWith.apply(node, nodes); });
                } else if (node.nodeName == 'SPAN') {
                    $(node).toggleClass('has-error');
                }
            }
        }
        for (let fn of replacements) fn();
        sel.collapseToEnd();
    }
})();
