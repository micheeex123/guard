Vue.config.debug = true;

let randomIntRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

var Events = {
  get(startDate, endDate) {
    return new Promise((resolve, reject) => {
      // TODO: Replace with actual API request
      // Generate some dummy events
      let events = []
      let start = moment(startDate)
      let end = moment(endDate)    
      let days = end.diff(start, 'days')
      for(let i = 0; i < days/4; i++) {
        let m = start.clone().add(randomIntRange(0, days), 'days')
        events.push({
          "id": i,
          "title": "Event " + i,
          "startDateTime":  m.add(randomIntRange(0, 24), 'hours').toISOString(),
          "endDateTime": m.add(randomIntRange(1, 3 * 24), 'hours').toISOString()
        })
      }
      resolve(events)
    })
  }
}

let Calendar = Vue.extend({
  template: '#calendar-template',
  props: {
    'month': { default: moment().month() + 1 },
    'year': { default: moment().year() }
  },
  data() {
    return {
      loading: true,
      days: []
    }
  },
  ready() {
    this.getEvents()
  },
  computed: {
    startDate() { 
      return moment().year(this.year).month(this.month - 1).startOf('month')
    },
    endDate() {
      return this.startDate.clone().add(this.startDate.daysInMonth() - 1,'days')
    },
    monthName() { 
      return moment().month(parseInt(this.month) - 1).format('MMMM')
    }
  },
  methods: {
    getEvents(){
      let self = this
      Events.get(self.startDate.toISOString(), self.endDate.toISOString()).then((events) => {
        // We have our events but we need to split up multi-day events into individual occurances
        let start = null
        let end = null
        let span = 1
        let seriesEvents = []
        for (event of events) {
            start = moment(event.startDateTime)
            end = moment(event.endDateTime)
            span = end.diff(start, 'days') + 1
            
            event.parentId = event.id
            if (span > 1) {
              event.firstInRange = true
              event.lastInRange = false

              for(let s = 1; s < span; s ++) {
                seriesEvents.push({
                  "id": 0,
                  "parentId": event.parentId,
                  "firstInRange": false,
                  "lastInRange": s === span-1,
                  "title": event.title,
                  "startDateTime":  start.clone().add(s, 'days').toISOString(),
                  "endDateTime": end.toISOString()
                })
              }
            } else {
                 event.firstInRange = true
                 event.lastInRange = true
            }
        }
        
        // Attempt to sort by time and event group bias
        // TODO: Remove or find a better solution
        events = events.concat(seriesEvents).sort(function(a, b){
            let keyA = new Date(a.unix),
                keyB = new Date(b.unix);
            let bias = a.id === 0 ? 1 : 0 
            
            if(keyA < keyB) return -1 + bias;
            if(keyA > keyB) return 1 + bias;
            return 0 + bias;
        })
                                
        self.updateDays(events)
        self.loading = false
      })
    },
    updateDays(events) {
      let m = () => moment().year(this.year).month(this.month - 1).startOf('month')
      let daysInMonth = m().daysInMonth();
      let previousMonthDays = m().date(1).day();
      let offset = 0 - previousMonthDays;
      let nextMonthDays = offset + (6 - m().date(daysInMonth).day());
      let total = daysInMonth + previousMonthDays + nextMonthDays;
      let days = [];
      
      for (let i = offset; i < total; i++) {
        var current = m().add(i, 'd');
        days.push({
          outsideOfCurrentMonth: (i < 0 || i > daysInMonth  - 1) ? true : false,
          date: current, 
          unix: current.valueOf(),
          weekday: current.format('dddd'),
          day: current.format('Do'),
          number: current.format('D'),
          month: current.format('MMMM'),
          year: current.format('YYYY'),
          events: events.filter((event) => {
            return current.isSame(event.startDateTime, 'day')
          })
        });
      }

      this.days = days;             
    }
  }
})

new Vue({
  el: '#app',
  components: {
    Calendar
  }
})