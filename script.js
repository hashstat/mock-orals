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
            url: `2021/${division.toLowerCase()}-${version.toLowerCase()}.json`,
        }).done(function (passages) {
            console.log(`received ${passages.length} passages`);
            let max_words = Number(valueOf($('#max_words')));
            if (!isNaN(max_words)) {
                passages = passages.filter(passage => (passage.words <= max_words));
                console.log(`${passages.length} passages remaining after filtering those with greater than ${max_words} words`);
            }

            let min_wpm = Number(valueOf($('#min_wpm'))),
                max_wpm = Number(valueOf($('#max_wpm'))),
                attempt, words, wpm;
            for (attempt = 0; attempt < 1000000; attempt++) {
                // TODO Limit the number of attempts to prevent a run-away script
                //      Maybe attempt to do a feasibility test beforehand
                let picked = pick(passages, 12);
                words = picked.reduce((total, p) => (total + p.words), 0);
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
                    $('<div></div>').append(
                        $(`<div class="number">${i + 1}</div>`),
                        $('<p class="reference"></p>').text(passage.reference),
                        $('<p></p>').append(passage.text.map((e, i) => (i % 2 ? document.createTextNode(` ${e} `) : $(`<sup>${e}</sup>`)))),
                        $('<p></p>').text(passage.reference)
                    )
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
})();
