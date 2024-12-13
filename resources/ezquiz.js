// # FUNCTIONALITY FOR EXERCISES #
(function (window, document) {
  'use strict';
  
  // primary object for functionality of the quizzes
  window.EZQuiz = {
    
    // exercise statistics
    stats : {
      problems : 0, // number of problems to solve in the lesson
        solved : 0, // number of problems solved
      mistakes : 0, // number of mistakes made in the lesson
         score : 0, // the student's score
       exclude : 0  // answers to exclude, mostly for text-only segments in multi-choice quizzes
    },

    // tells us if it is being used on a local file system so we can append index.html to URLs
    local : window.location.protocol == 'file:' ? 'index.html' : '',

    // scroll to the specified element: EZQuiz.scrollTo('#lesson-3')
    // scrolling can be delayed by passing a value that evaluates to true (true; 1; '.') to the second param; delay
    // the second param is mostly for script generated content, i.e. the exercises, since there's a small delay before the content is visible
    scrollTo : function (el, delay) {
      // check if el is a selector
      if (typeof el == 'string') {
        el = document.querySelector(el);
      }

      var scroll = function () {
        document.body.scrollTop = el.offsetTop;
        document.documentElement.scrollTop = el.offsetTop;
      };

      // scroll immediately or wait 100ms
      // the latter is for exercises, where there's a slight delay before content is available
      if (delay) {
        setTimeout(scroll, 100);
      } else {
        scroll();
      }
    },


    // To generate a quiz simply pass an object with the necessary data (see vocab-1/index.html and other quiz files for examples)
    generate : function (o) {
      var zone = document.getElementById('quiz-zone'), // area where quizzes are inserted 
          quiz = '<div id="quiz-info">' + o.info + '</div><div id="question-list">',
          answers = '<div id="answer-list">',
          option = 65, // used for tagging answers as A(65), B(66), C(67)..
          isAnswer = false,
          q = o.quiz,
          i = 0,
          j = q.length,
          n;

      // create individual blocks for each question and hide them until later
      for (; i < j; i++) {
        quiz += '<div id="quiz-q' + i + '" class="question-block" data-qid="' + (i + 1) + '" style="display:none;"><div class="quiz-multi-question">' + (typeof q[i].question != 'undefined' ? q[i].question + (q[i].image ? '<img class="quiz-image" src="../../../resources/images/test-images/' + q[i].image + '" alt="' + q[i].image + '">' : '') : '<div class="text-passage' + (q[i].vertical ? ' vertical-text' : '') + '" ' + (q[i].text.replace(/<br>/g, '').length < 50 ? 'style="text-align:center;"' : '') + '>' + q[i].text + '</div>' + (q[i].helper || '')) + '</div>';

        // ready-only questions contain text only, no answers
        if (q[i].text) {
          quiz += '<div class="quiz-multi-row"><button class="quiz-multi-answer next-question" onclick="EZQuiz.progress(this, true);">NEXT</button></div>';
          ++EZQuiz.stats.exclude; // exclude this block from the overall score

        } else { // standard question block construction

          // add answers to the question block
          while (q[i].answers.length) {
            n = Math.floor(Math.random() * q[i].answers.length);

            // answers that begin with "+" are the correct answer. '+True';
            if (q[i].answers[n].charAt(0) == '+') {
              isAnswer = true;
              q[i].answers[n] = q[i].answers[n].slice(1);
            }

            quiz += '<div class="quiz-multi-row"><div tabindex="0" class="quiz-multi-answer" data-answer="' + isAnswer + '" data-option="' + String.fromCharCode(option++) + '" onclick="EZQuiz.progress(this);" onkeypress="event.key == \'Enter\' && EZQuiz.progress(this);"><div class="quiz-answer-inner-text">' + q[i].answers[n] + '</div></div></div>';
            isAnswer = false;

            q[i].answers.splice(n, 1);
          }

        }

        quiz += '</div>'; // ends the question block
        option = 65; // resets the option id so the next answers begin with A, B, C..
        ++EZQuiz.stats.problems; // increment problems number
      }

      // add the multi-choice quiz to the quiz zone
      zone.innerHTML = quiz + '</div><div id="quiz-progress"><div id="quiz-progress-bar"></div></div>';

      // begin the quiz
      EZQuiz.progress('init');

      // exercise timer
      var timer = new Timer(),
          clock = document.getElementById('quiz-timer');

      clock.innerHTML = '00:00:00'; // placeholder
      timer.start();
      timer.addEventListener('secondsUpdated', function (e) {
        clock.innerHTML = timer.getTimeValues().toString()
      });

      EZQuiz.timer = timer;

      // indicate the exercise has been loaded in
      document.getElementById('exercise').className += ' content-loaded ' + o.type + '-quiz';

      // jump to the exercise title
      EZQuiz.scrollTo('#exercise-title', true);
      
      // autofocus answer options
      var q = document.querySelector('.quiz-multi-answer');
      if (q) q.focus();
    },


    // increment the progress bar (for multi-choice quizzes)
    incrementProgressBar : function () {
      var bar = document.getElementById('quiz-progress-bar'),
          progress = Math.floor((EZQuiz.stats.solved+1) / EZQuiz.stats.problems * 100);

      bar.style.width = progress + '%';
      bar.innerHTML = '<span id="quiz-progress-text">' + (EZQuiz.stats.solved+1) + '/' + EZQuiz.stats.problems + '</span>';
    },


    // show the next question in a multi-choice quiz
    progress : function (answer, exclude) {
      // prevent quiz progression if the quiz is over
      if (EZQuiz.quizOver) {
        return false;
      }
      
      if (answer == 'init') {
        document.getElementById('quiz-q' + EZQuiz.stats.solved).style.display = '';
        EZQuiz.incrementProgressBar();

      } else {
        // mark the selected answer for reviews
        answer.className += ' selected-answer';

        // hide NEXT button for read-only questions
        if (exclude) {
          answer.parentNode.className += ' hidden-answer';
        }

        // increment mistakes if the chosen answer was wrong and add a class to the parent
        if (answer.dataset.answer == 'false') {
          answer.parentNode.parentNode.className += ' wrong-answer';
          ++EZQuiz.stats.mistakes;
        }

        // if there's another question, show it and hide the last one
        var last = document.getElementById('quiz-q' + EZQuiz.stats.solved++),
            next = document.getElementById('quiz-q' + EZQuiz.stats.solved);

        if (next) {
          next.style.display = ''; // show the next question
          last.style.display = 'none'; // hide the prior question
          
          // focus answer for next question
          var q = next.querySelector('.quiz-multi-answer');
          if (q) q.focus();
          
          EZQuiz.incrementProgressBar();

        } else { // end the quiz if there's no new question
          EZQuiz.end();

          // show all questions and answers
          for (var q = document.querySelectorAll('[id^="quiz-q"]'), i = 0, j = q.length; i < j; i++) {
            q[i].style.display = '';
          }

          // hide the progress bar
          document.getElementById('quiz-progress').style.display = 'none';
        }
      }
    },


    // ends the quiz
    end : function () {
      EZQuiz.quizOver = true;
      
      // calculate the total score based on problems solved and mistakes made
      var solved = EZQuiz.stats.solved - EZQuiz.stats.exclude,
          problems = EZQuiz.stats.problems - EZQuiz.stats.exclude;

      EZQuiz.stats.score = Math.floor((solved - EZQuiz.stats.mistakes) * 100 / problems);
      EZQuiz.timer.stop();

      // hide the timer and store it so we can show the completion time in the results
      var timer = document.getElementById('quiz-timer'),
          wrong = 'The answers you selected that were wrong are outlined in <span class="t-red">red</span>. The correct answers are outlined in <span class="t-blue">blue</span>. Review these problems before trying again.';
      timer.style.display = 'none';

      // show the student their results
      document.getElementById('quiz-result').innerHTML = 
      '<div id="complete-banner" class="center">Quiz Complete!</div>'+
      '<div id="result-list">'+
        '<div class="result-row"><span class="result-label">Problems Solved:</span>' + problems + '</div>'+
        '<div class="result-row"><span class="result-label">Answers Wrong:</span>' + EZQuiz.stats.mistakes + '</div>'+
        '<div class="result-row"><span class="result-label">Score:</span>' + EZQuiz.stats.score + '%</div>'+
        '<div class="result-row"><span class="result-label">Completion Time:</span>' + timer.innerHTML + '</div>'+
        '<div class="result-row center">'+
          ( // depending on the score, a specific message will show
            EZQuiz.stats.score == 100 ? 'PERFECT! Great Job, you have mastered this quiz! Feel free to move on or challenge yourself by trying to beat your completion time.' :
            EZQuiz.stats.score > 70 ? 'Nice work! ' + wrong :
            'Keep studying! ' + wrong
          )+
          '<div class="center">'+
            '<a href="./' + EZQuiz.local + '" class="button">Try Again</a>'+
            '<a href="' + document.getElementById('home-link').href + '" class="button">Back to Index</a>'+
          '</div>'+
        '</div>'+
      '</div>';

      // this class will indicate the quiz is over so post-test styles can be applied
      document.getElementById('exercise').className += ' quiz-over';
      EZQuiz.scrollTo('#complete-banner', true); // jump to the quiz results
    }
  };
}(window, document));