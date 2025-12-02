class PricingService {
  constructor() {
    this.pricingMatrix = {
      stalls: {
        matinee: {
          'AA-DD': 2.00, // +200%
          'A-M': 1.50,   // +150%
          'P-V': 1.00    // +100%
        },
        evening: {
          'AA-DD': 2.50, // +250%
          'A-M': 1.75,   // +175%
          'P-V': 1.50    // +150%
        }
      },
      circle: {
        matinee: {
          'premium-front': 1.50, // Row A seats 1-6, 71-76 etc.
          'standard': 1.25,      // Row A seats 7-27, 50-70 etc.
          'premium-rear': 2.10   // Row A seats 28-49 etc.
        },
        evening: {
          'premium-front': 1.75,
          'standard': 1.50,
          'premium-rear': 2.20
        }
      },
      upperCircle: {
        matinee: {
          'front': 0.80,  // +80%
          'middle': 0.50, // +50%
          'rear': 0.75,   // +75%
          'base': 0.00    // Base price
        },
        evening: {
          'front': 1.00,  // +100%
          'middle': 0.70, // +70%
          'rear': 1.00,   // +100%
          'base': 0.00    // Base price
        }
      }
    };

    this.concessions = {
      child: 0.35,  // 35% discount for under 16
      senior: 0.30, // 30% discount for over 70
      group: 0.15   // 15% discount for groups of 10+
    };
  }

  getSeatCategory(section, row, seatNumber) {
    const seatNum = parseInt(seatNumber);
    
    switch(section) {
      case 'stalls':
        if (['AA','BB','CC','DD'].includes(row)) return 'AA-DD';
        if (['A','B','C','D','E','F','G','H','I','J','K','L','M'].includes(row)) return 'A-M';
        if (['P','Q','R','S','T','U','V'].includes(row)) return 'P-V';
        break;
        
      case 'circle':
        if (row === 'A' && (seatNum <= 6 || (seatNum >= 71 && seatNum <= 76))) return 'premium-front';
        if (row === 'B' && (seatNum <= 8 || (seatNum >= 75 && seatNum <= 82))) return 'premium-front';
        if (row === 'C' && (seatNum <= 8 || (seatNum >= 82 && seatNum <= 89))) return 'premium-front';
        
        if (row === 'A' && ((seatNum >= 7 && seatNum <= 27) || (seatNum >= 50 && seatNum <= 70))) return 'standard';
        if (row === 'B' && ((seatNum >= 9 && seatNum <= 31) || (seatNum >= 52 && seatNum <= 74))) return 'standard';
        if (row === 'C' && ((seatNum >= 9 && seatNum <= 34) || (seatNum >= 56 && seatNum <= 81))) return 'standard';
        
        if (row === 'A' && (seatNum >= 28 && seatNum <= 49)) return 'premium-rear';
        if (['B','C','D','E'].includes(row) && seatNum >= 32 && seatNum <= 51) return 'premium-rear';
        break;
        
      case 'upperCircle':
        if (row === 'A' && (seatNum <= 6 || (seatNum >= 83 && seatNum <= 88))) return 'front';
        if (row === 'B' && (seatNum <= 8 || (seatNum >= 86 && seatNum <= 93))) return 'front';
        if (row === 'C' && (seatNum <= 8 || (seatNum >= 69 && seatNum <= 76))) return 'front';
        
        if (row === 'A' && ((seatNum >= 7 && seatNum <= 32) || (seatNum >= 57 && seatNum <= 82))) return 'middle';
        if (row === 'B' && ((seatNum >= 9 && seatNum <= 34) || (seatNum >= 80 && seatNum <= 85))) return 'middle';
        if (row === 'C' && ((seatNum >= 9 && seatNum <= 24) || (seatNum >= 53 && seatNum <= 68))) return 'middle';
        
        if (row === 'A' && (seatNum >= 33 && seatNum <= 56)) return 'rear';
        if (row === 'B' && (seatNum >= 35 && seatNum <= 59)) return 'rear';
        
        return 'base';
    }
    
    return 'standard';
  }

  calculateSeatPrice(basePrice, eventType, section, row, seatNumber, concessionType = 'adult', isLoyaltyMember = false) {
    const category = this.getSeatCategory(section, row, seatNumber);
    const multiplier = this.pricingMatrix[section]?.[eventType]?.[category] || 1.0;
    
    let price = basePrice * (1 + multiplier);
    
    // Apply best concession
    if (concessionType !== 'adult' && this.concessions[concessionType]) {
      price = price * (1 - this.concessions[concessionType]);
    }
    
    // Apply loyalty discount
    if (isLoyaltyMember) {
      price = price * 0.90; // 10% discount
    }
    
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  calculateTotalPrice(seats, basePrice, eventType, concessions = [], isLoyaltyMember = false) {
    return seats.reduce((total, seat) => {
      const concessionType = this.getBestConcession(concessions);
      const price = this.calculateSeatPrice(
        basePrice, 
        eventType, 
        seat.section, 
        seat.row, 
        seat.seatNumber, 
        concessionType, 
        isLoyaltyMember
      );
      return total + price;
    }, 0);
  }

  getBestConcession(concessions) {
    if (!concessions || concessions.length === 0) return 'adult';
    
    const concessionValues = concessions.map(concession => ({
      type: concession,
      value: this.concessions[concession] || 0
    }));
    
    const bestConcession = concessionValues.reduce((best, current) => 
      current.value > best.value ? current : best
    );
    
    return bestConcession.type;
  }
}

module.exports = new PricingService();