# Converts real circuit outlines (bacinger/f1-circuits GeoJSON, MIT) into game control points -> src/data/tracks.js
import json, math
D = 'tools/data/'
def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        p = pts[i]; d = abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]
# id, file, name, gp, country, flag, laps, length(m), width, elev, grip, temp, night, theme, character, weather, month, sprint
T = [
 ('melbourne','au-1953','Albert Park Circuit','Australian Grand Prix','Australia','AUS',58,5278,14,3,0.97,'mild',False,'COASTAL',['flowing','high-speed'],[0.55,0.25,0.12,0.08],'MAR',False),
 ('shanghai','cn-2004','Shanghai International Circuit','Chinese Grand Prix','China','CHN',56,5451,15,4,0.98,'mild',False,'TEMPERATE',['technical','heavy-braking','tire-killer'],[0.45,0.3,0.15,0.1],'MAR',True),
 ('suzuka','jp-1962','Suzuka International Racing Course','Japanese Grand Prix','Japan','JPN',53,5807,13,40,1.0,'mild',False,'TEMPERATE',['flowing','high-speed','tire-killer'],[0.45,0.3,0.15,0.1],'MAR',False),
 ('sakhir','bh-2002','Bahrain International Circuit','Bahrain Grand Prix (not held at Sakhir in 2026)','Bahrain','BHR',57,5412,15,4,0.95,'hot',True,'DESERT',['stop-and-go','heavy-braking','tire-killer'],[0.9,0.1,0.0,0.0],'APR',False),
 ('jeddah','sa-2021','Jeddah Corniche Circuit','Saudi Arabian Grand Prix (cancelled in 2026)','Saudi Arabia','KSA',50,6174,13,2,0.97,'hot',True,'DESERT',['high-speed','flowing'],[0.92,0.08,0.0,0.0],'APR',False),
 ('miami','us-2022','Miami International Autodrome','Miami Grand Prix','USA','USA',57,5412,14,2,0.96,'hot',False,'TROPICAL',['stop-and-go','high-speed'],[0.55,0.25,0.12,0.08],'MAY',True),
 ('montreal','ca-1978','Circuit Gilles Villeneuve','Canadian Grand Prix','Canada','CAN',70,4361,13,2,0.95,'mild',False,'TEMPERATE',['stop-and-go','heavy-braking'],[0.5,0.25,0.15,0.1],'MAY',True),
 ('monaco','mc-1929','Circuit de Monaco','Monaco Grand Prix','Monaco','MON',78,3337,10,30,0.94,'warm',False,'COASTAL_MED',['technical','stop-and-go'],[0.7,0.2,0.07,0.03],'JUN',False),
 ('barcelona','es-1991','Circuit de Barcelona-Catalunya','Barcelona-Catalunya Grand Prix','Spain','ESP',66,4657,13,30,0.97,'warm',False,'MEDITERRANEAN',['flowing','technical','tire-killer'],[0.65,0.22,0.09,0.04],'JUN',False),
 ('spielberg','at-1969','Red Bull Ring','Austrian Grand Prix','Austria','AUT',71,4318,14,65,1.0,'mild',False,'ALPINE',['stop-and-go','heavy-braking','high-speed'],[0.45,0.3,0.17,0.08],'JUN',False),
 ('silverstone','gb-1948','Silverstone Circuit','British Grand Prix','Great Britain','GBR',52,5891,15,10,0.98,'cool',False,'EUROPEAN',['flowing','high-speed','wet-prone'],[0.35,0.33,0.2,0.12],'JUL',True),
 ('spa','be-1925','Circuit de Spa-Francorchamps','Belgian Grand Prix','Belgium','BEL',44,7004,14,100,1.0,'cool',False,'ALPINE',['high-speed','flowing','wet-prone'],[0.3,0.32,0.23,0.15],'JUL',False),
 ('hungaroring','hu-1986','Hungaroring','Hungarian Grand Prix','Hungary','HUN',70,4381,13,30,0.97,'hot',False,'EUROPEAN',['technical','tire-killer'],[0.65,0.2,0.1,0.05],'JUL',False),
 ('zandvoort','nl-1948','Circuit Zandvoort','Dutch Grand Prix','Netherlands','NED',72,4259,12,15,0.98,'cool',False,'LOWLANDS',['flowing','technical','wet-prone'],[0.35,0.35,0.18,0.12],'AUG',True),
 ('monza','it-1922','Autodromo Nazionale Monza','Italian Grand Prix','Italy','ITA',53,5793,14,5,1.0,'warm',False,'TUSCAN',['high-speed','heavy-braking'],[0.65,0.2,0.1,0.05],'SEP',False),
 ('madring','es-2026','Madring','Spanish Grand Prix','Spain','ESP',57,5474,13,20,0.95,'warm',False,'ARID',['technical','stop-and-go','high-speed'],[0.7,0.2,0.07,0.03],'SEP',False),
 ('baku','az-2016','Baku City Circuit','Azerbaijan Grand Prix','Azerbaijan','AZE',51,6003,12,25,0.94,'warm',False,'ARID',['high-speed','stop-and-go','heavy-braking'],[0.7,0.22,0.06,0.02],'SEP',False),
 ('sepang','my-1999','Sepang International Circuit','Bahrain Grand Prix (relocated to Sepang)','Malaysia','MAS',56,5543,15,8,0.96,'hot',False,'TROPICAL',['high-speed','tire-killer','wet-prone'],[0.4,0.25,0.2,0.15],'OCT',False),
 ('singapore','sg-2008','Marina Bay Street Circuit','Singapore Grand Prix','Singapore','SGP',62,4940,12,3,0.94,'hot',True,'TROPICAL',['technical','stop-and-go','tire-killer'],[0.6,0.2,0.12,0.08],'OCT',True),
 ('austin','us-2012','Circuit of the Americas','United States Grand Prix','USA','USA',56,5513,15,40,0.97,'warm',False,'ARID',['technical','heavy-braking','tire-killer'],[0.6,0.25,0.1,0.05],'OCT',False),
 ('mexico','mx-1962','Autódromo Hermanos Rodríguez','Mexico City Grand Prix','Mexico','MEX',71,4304,14,5,0.95,'warm',False,'ARID',['stop-and-go','heavy-braking','high-speed'],[0.7,0.2,0.07,0.03],'OCT',False),
 ('interlagos','br-1940','Autódromo José Carlos Pace (Interlagos)','São Paulo Grand Prix','Brazil','BRA',71,4309,14,40,0.97,'warm',False,'TROPICAL',['flowing','technical','wet-prone'],[0.4,0.3,0.18,0.12],'NOV',False),
 ('lasvegas','us-2023','Las Vegas Strip Circuit','Las Vegas Grand Prix','USA','USA',50,6201,14,2,0.92,'cool',True,'DESERT',['high-speed','stop-and-go'],[0.92,0.08,0.0,0.0],'NOV',False),
 ('lusail','qa-2004','Lusail International Circuit','Qatar Grand Prix','Qatar','QAT',57,5419,14,2,0.96,'hot',True,'DESERT',['flowing','high-speed','tire-killer'],[0.92,0.08,0.0,0.0],'NOV',False),
 ('yasmarina','ae-2009','Yas Marina Circuit','Abu Dhabi Grand Prix','United Arab Emirates','UAE',58,5281,15,3,0.97,'hot',True,'DESERT',['stop-and-go','technical'],[0.95,0.05,0.0,0.0],'DEC',False),
]
out = []
for (tid,f,name,gp,country,flag,laps,length,width,elev,grip,temp,night,theme,ch,wx,month,sprint) in T:
    g = json.load(open(D+f+'.geojson'))
    geom = g['features'][0]['geometry']; c = geom['coordinates']
    if geom['type'] == 'MultiLineString': c = max(c, key=len)
    lat0 = sum(p[1] for p in c)/len(c); lon0 = sum(p[0] for p in c)/len(c)
    P = [((p[0]-lon0)*111320*math.cos(math.radians(lat0)), (p[1]-lat0)*110540) for p in c]
    if math.hypot(P[0][0]-P[-1][0], P[0][1]-P[-1][1]) < 1: P = P[:-1]
    h = len(P)//2
    S = rdp(P[:h+1], 4.0)[:-1] + rdp(P[h:] + [P[0]], 4.0)[:-1]
    # avoid near-duplicate points (spline loops)
    Q = [S[0]]
    for p in S[1:]:
        if math.hypot(p[0]-Q[-1][0], p[1]-Q[-1][1]) > 12: Q.append(p)
    # pts[0] = point before start, pts[1] = on the main straight; rotate so that start line ~ index 1
    if tid in ('singapore',): Q = [Q[0]] + Q[1:][::-1]  # outline drawn against race direction (Marina Bay runs anticlockwise)
    Q = Q[-1:] + Q[:-1]
    pts = [[round(x-Q[1][0]), round(y-Q[1][1])] for x,y in Q]
    out.append(dict(id=tid,name=name,gp=gp,country=country,flag=flag,inspiration=gp,laps=laps,length=length,width=width,elevation=elev,grip=grip,temp=temp,night=night,theme=theme,character=ch,weather=wx,sprint=sprint,month=month,pts=pts))
    print(tid, len(c), '->', len(pts))
js = ['// Real 2026 FIA Formula One World Championship circuits. Outlines from the bacinger/f1-circuits GeoJSON (MIT),',
 '// converted to local metres (x=east, y=north) by tools/gen-tracks.py; the geometry builder scales them to the official `length`.',
 '// laps = official Grand Prix race distance. character / weather / theme drive the sim and visuals (see original notes).',
 'export const TRACKS = [']
for t in out:
    pts = t.pop('pts'); month = t.pop('month')
    js.append('  ' + json.dumps({**t, 'pts': pts}, ensure_ascii=False) + ',')
js.append('];')
js.append('export const TRACK_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t]));')
js.append('// 2026 calendar as actually run: 24 rounds announced; Saudi Arabian GP cancelled and Bahrain GP relocated to Sepang (Oct 4)')
js.append('// after the 2026 Middle East conflict -> 23 rounds. Sakhir and Jeddah stay in the circuit database for Quick Race.')
CAL = [t for t in T if t[0] not in ('sakhir','jeddah')]
js.append('export const CALENDAR = ' + json.dumps([{'id':t[0],'month':t[16]} for t in CAL]) + ';')
open('src/data/tracks.js','w').write('\n'.join(js)+'\n'+open('tools/data/tracks-tail.js').read())
