import sys
sys.path.insert(0, '/app')
from app.services.ko_propagation import assign_consolation_first_round_losers
import inspect
print(inspect.signature(assign_consolation_first_round_losers))
