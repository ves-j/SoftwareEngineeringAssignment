const Seat = require('../models/seat.model');

class SeatService {
  async initializeTheaterLayout() {
    const seatCount = await Seat.countDocuments();
    if (seatCount > 0) return; // Already initialized

    const seats = [];
    
    // Initialize Stalls
    const stallRows = ['AA','BB','CC','DD','A','B','C','D','E','F','G','H','I','J','K','L','M','P','Q','R','S','T','U','V'];
    stallRows.forEach(row => {
      const seatCount = ['AA','BB','CC','DD'].includes(row) ? 20 : 
                       ['A','B','C','D','E','F','G','H','I','J','K','L','M'].includes(row) ? 25 : 20;
      
      for (let i = 1; i <= seatCount; i++) {
        seats.push({
          seatNumber: i.toString(),
          row: row,
          section: 'stalls',
          category: this.getStallCategory(row),
          isAvailable: true
        });
      }
    });

    // Initialize Circle
    const circleRows = ['A','B','C','D','E'];
    circleRows.forEach(row => {
      const seatCount = row === 'A' ? 76 : row === 'B' ? 82 : row === 'C' ? 89 : 60;
      
      for (let i = 1; i <= seatCount; i++) {
        seats.push({
          seatNumber: i.toString(),
          row: row,
          section: 'circle',
          category: this.getCircleCategory(row, i),
          isAvailable: true
        });
      }
    });

    // Initialize Upper Circle
    const upperCircleRows = ['A','B','C'];
    upperCircleRows.forEach(row => {
      const seatCount = row === 'A' ? 88 : row === 'B' ? 93 : 76;
      
      for (let i = 1; i <= seatCount; i++) {
        seats.push({
          seatNumber: i.toString(),
          row: row,
          section: 'upperCircle',
          category: this.getUpperCircleCategory(row, i),
          isAvailable: true
        });
      }
    });

    await Seat.insertMany(seats);
    console.log('Theater layout initialized with', seats.length, 'seats');
  }

  getStallCategory(row) {
    if (['AA','BB','CC','DD'].includes(row)) return 'AA-DD';
    if (['A','B','C','D','E','F','G','H','I','J','K','L','M'].includes(row)) return 'A-M';
    return 'P-V';
  }

  getCircleCategory(row, seatNumber) {
    if (row === 'A' && (seatNumber <= 6 || (seatNumber >= 71 && seatNumber <= 76))) return 'premium-front';
    if (row === 'B' && (seatNumber <= 8 || (seatNumber >= 75 && seatNumber <= 82))) return 'premium-front';
    if (row === 'C' && (seatNumber <= 8 || (seatNumber >= 82 && seatNumber <= 89))) return 'premium-front';
    
    if (row === 'A' && ((seatNumber >= 7 && seatNumber <= 27) || (seatNumber >= 50 && seatNumber <= 70))) return 'standard';
    if (row === 'B' && ((seatNumber >= 9 && seatNumber <= 31) || (seatNumber >= 52 && seatNumber <= 74))) return 'standard';
    if (row === 'C' && ((seatNumber >= 9 && seatNumber <= 34) || (seatNumber >= 56 && seatNumber <= 81))) return 'standard';
    
    return 'premium-rear';
  }

  getUpperCircleCategory(row, seatNumber) {
    if (row === 'A' && (seatNumber <= 6 || (seatNumber >= 83 && seatNumber <= 88))) return 'front';
    if (row === 'B' && (seatNumber <= 8 || (seatNumber >= 86 && seatNumber <= 93))) return 'front';
    if (row === 'C' && (seatNumber <= 8 || (seatNumber >= 69 && seatNumber <= 76))) return 'front';
    
    if (row === 'A' && ((seatNumber >= 7 && seatNumber <= 32) || (seatNumber >= 57 && seatNumber <= 82))) return 'middle';
    if (row === 'B' && ((seatNumber >= 9 && seatNumber <= 34) || (seatNumber >= 80 && seatNumber <= 85))) return 'middle';
    if (row === 'C' && ((seatNumber >= 9 && seatNumber <= 24) || (seatNumber >= 53 && seatNumber <= 68))) return 'middle';
    
    if (row === 'A' && (seatNumber >= 33 && seatNumber <= 56)) return 'rear';
    if (row === 'B' && (seatNumber >= 35 && seatNumber <= 59)) return 'rear';
    
    return 'base';
  }

  async getAvailableSeats(eventId, section = null) {
    let query = { isAvailable: true };
    if (section) query.section = section;
    
    return await Seat.find(query).sort({ section: 1, row: 1, seatNumber: 1 });
  }

  async getSeatPricing(seatId, event) {
    const seat = await Seat.findById(seatId);
    if (!seat) throw new Error('Seat not found');

    console.log('B')
    const pricingService = require('./pricing.service');
    return pricingService.calculateSeatPrice(
      event.basePrice,
      event.eventType,
      seat.section,
      seat.row,
      seat.seatNumber
    );
  }
}

module.exports = new SeatService();