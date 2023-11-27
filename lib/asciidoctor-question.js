// This is a partial port of the Asciidoctor Question extension to Asciidoctor.js.
//
// Original Ruby extension: https://github.com/vifito/asciidoctor-question
//
// Only the 'mc' (multiple choice) question type is implemented, and only the answer part.
// (as this is the way the extension has been used).
//

'use strict'

const cheerio = require('cheerio')

const q_regex = /^-\s?\[/

var question_id = 0

module.exports = function (registry) {
  // A block processor for [question] blocks
  // Splits questions from answers, adds the 'interactive' role
  // and adds the resolve/reset buttons.
  registry.block(function () {
    var self = this
    self.named('question')
    self.onContext('literal')
    self.process(function (parent, source, tag, reader) {
      // TODO: Work out type, mc or not.

      // Generate an id
      //console.log("tag", tag)
      var id = question_id++
      //console.log("id", id)

      var question = []
      var answers = ['[options=interactive]']

      var lines = source.getLines().map(function (l) {
        if (q_regex.test(l)) {
          l = l.replace(']', '] +++ <span></span> +++')
          answers.push(l)
          //console.log("A", l)
        } else {
          question.push(l)
          //console.log("Q", l)
        }
      })

      // Attributes become question_{id}_type=mc
      var attrs = {'id': "question_"+id+"_type=mc"}

      // TODO: shuffle answers if needed
      // attrs['id'] += '_shuffle' unless tag[:shuffle].nil?

      // new block with the attributes
      //console.log(self.createBlock.toString())
      var new_parent = self.createBlock(parent, 'open', '', attrs)
      //console.log("n_p", new_parent)

      // TODO: process questions

      // process answers
      const PreprocessorReader = global.Opal.Asciidoctor.PreprocessorReader
      const Reader = global.Opal.Asciidoctor.Reader
      var answer_reader = Reader.$new(answers, null, null)
      //console.log("a_r", answer_reader)
      //console.log("answer_reader.pi", answerreader.pushInclude.toString())

      const Parser = global.Opal.Asciidoctor.Parser
      //console.log("p", Parser)
      //console.log("pnb", Parser.$next_block)
      //console.log("pnb", Parser.$next_block.toString())

      var answers_block = Parser.$next_block(answer_reader, new_parent)
      //console.log("ans_bl", answers_block)

      // answers id answers_mc_{id}

      // each answer id answer_md_{id}_{aid}

      //console.log(new_parent)

      //self.createBlock(parent, 'pass', lines[0])
      //console.log("n_p.gB", new_parent.getBlocks().toString())
      new_parent.getBlocks().push(answers_block)

      new_parent.getBlocks().push(self.createBlock(parent, 'pass', "<p style=\"margin-bottom: 25px\"><button onclick='resolve("+id+")'>resolve</button><button onclick='reset("+id+")'>reset</button></p>"))

      //console.log('-')
      // TODO: For some reason, the unaltered lines are then processed again. Maybe I'm not
      // consuming them properly.
      return new_parent
    })
  })

  registry.postprocessor(function () {
    var self = this
    self.process(function (doc, output) {
      // TODO Add CSS (although its in the theme)

      const $ = cheerio.load(output, null, false)

      // Generate data- properties for the question elements.
      $('div[id*=question]').each(function (i, elm) {
        var qq = $('<question>')

        //console.log("i", i)
        //console.log("elm", $(elm).text())
        //console.log("end elm")
        var question_id = $(elm).attr('id')
        //console.log("orig id", question_id)
        var question_parts = question_id.split('_')
        //console.log(question_parts)
        var question_newid = question_parts.shift() + '_' + question_parts.shift()
        //var attribs = {"id": question_newid}
        qq.attr('id', question_newid)
        question_parts.forEach((data) => {
          var tmp = data.split('=')
          //console.log('data-'+tmp[0]+'='+tmp[1])
          //question_parts['data-'+tmp[0]] = tmp[1]
          qq.attr('data-'+tmp[0], tmp[1])
        })

        //console.log(`<question id="${question_newid}"> ... </question>`)

        qq.html($(elm).html())
        //console.log(qq.html())

        $(elm).replaceWith(qq)
      })

      $('question[id*=question][data-type=mc] input[type="checkbox"]').each(function (i, elm) {
        //console.log("AOEU", $(elm).html())
        $(elm).attr('data-correct', $(elm).attr('checked') != null)
        $(elm).attr('checked', null)
      })

      var javascript = `
<script type="text/javascript">
function onLoad() {
    var questions = document.getElementsByTagName("question")
    for (var pos = 0; pos < questions.length; pos++) {
        var question = questions[pos]
        if (question.getAttribute('data-type') == 'mc') {
            if (question.getAttribute('data-shuffle') != null) shuffleAnswers(question)
        }
    }
}

function shuffleAnswers(question) {
    var answers = null
    var content = question.children[0]
    for (var i = content.children.length-1; i >= 0; i--) {
        if(content.children[i].className.indexOf('checklist') > -1) {
            answers = content.children[i].children[0]
            break;
        }
    }
    if(answers == null) return

    for (var i = answers.children.length; i >= 0; i--) {
        answers.appendChild(answers.children[Math.random() * i | 0]);
    }
}

function resolve(questionId) {
    var q = document.getElementById("question_" + questionId)
    var type = q.getAttribute("data-type")
    var elems
    var pos
    var answer

    if(type == "mc") {
        elems = q.getElementsByTagName("input")
        for(pos = 0; pos < elems.length; pos++) {
            answer = elems[pos]
            answer.setAttribute("class", "show")
        }
    } else if(type == "gap") {
        elems = q.getElementsByTagName("gap")
        for(pos = 0; pos < elems.length; pos++) {
            var gap = elems[pos]
            var input = gap.getElementsByTagName("input")[0]
            answer = gap.getElementsByTagName("answer")[0]
            if(input.value == answer.textContent) {
                input.setAttribute("class", "correct")
            } else {
                input.setAttribute("class", "incorrect")
                answer.setAttribute("class", "")
            }
        }
    }
}

function reset(questionId) {
    var q = document.getElementById("question_" + questionId)
    var type = q.getAttribute("data-type")
    var elems
    var pos
    var answer

    if(type == "mc") {
        elems = q.getElementsByTagName("input")
        for(pos = 0; pos < elems.length; pos++) {
            answer = elems[pos]
            answer.setAttribute("class", "")
            answer.checked = false
        }
    } else if(type == "gap") {
        elems = q.getElementsByTagName("gap")
        for(pos = 0; pos < elems.length; pos++) {
            var gap = elems[pos]
            var input = gap.getElementsByTagName("input")[0]
            answer = gap.getElementsByTagName("answer")[0]
            input.setAttribute("class", "")
            answer.setAttribute("class", "hidden")
        }
    }
}
</script>`

      return $.html() + javascript
    })
  })
}
