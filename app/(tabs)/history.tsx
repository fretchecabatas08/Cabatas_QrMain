import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { getAttendanceHistory, type AttendanceRecord, getTeacherEventAttendance, type TeacherEventAttendance } from '@/docs/lib/attendance';
import { getProfile, type Role } from '@/docs/lib/profile';
import { supabase } from '@/docs/lib/supabase';

type AdminEventAttendance = { id:string; event_code:string; title:string; start:string; end:string; status?:string; attendees:{id:string;student_id:string;scanned_at:string;name:string}[] };
const fmt=(v:string)=>new Date(v).toLocaleString();
const shortId=(id:string)=>id?`…${id.slice(-8)}`:'Unknown student';

export default function HistoryScreen() {
 const {user}=useAuth();
 const [role,setRole]=useState<Role|null>(null);
 const [records,setRecords]=useState<AttendanceRecord[]>([]);
 const [teacherEvents,setTeacherEvents]=useState<TeacherEventAttendance[]>([]);
 const [adminEvents,setAdminEvents]=useState<AdminEventAttendance[]>([]);
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  if(!user){setRole(null);setRecords([]);setTeacherEvents([]);setAdminEvents([]);setLoading(false);return;}
  setLoading(true);
  try{
   const profile=await getProfile(user.id);const currentRole=profile?.role??'student';setRole(currentRole);
   if(currentRole==='admin'){
    const [evRes,attRes,profRes]=await Promise.all([
     supabase.from('events').select('id,event_code,title,start,"end",status').order('created_at',{ascending:false}),
     supabase.from('attendance').select('id,event_id,student_id,scanned_at').order('scanned_at',{ascending:false}),
     supabase.from('profiles').select('id,full_name,email'),
    ]);
    const bad=[evRes,attRes,profRes].find(r=>r.error);if(bad?.error)throw bad.error;
    const profileMap=new Map((profRes.data??[]).map((p:any)=>[p.id,p.full_name||p.email||shortId(p.id)]));
    const attendance=attRes.data??[];
    setAdminEvents((evRes.data??[]).map((ev:any)=>({ ...ev, attendees:attendance.filter((a:any)=>a.event_id===ev.id).map((a:any)=>({id:a.id,student_id:a.student_id,scanned_at:a.scanned_at,name:profileMap.get(a.student_id)||shortId(a.student_id)})) })));
    setRecords([]);setTeacherEvents([]);
   }else if(currentRole==='teacher'){
    setTeacherEvents(await getTeacherEventAttendance(user.id));setRecords([]);setAdminEvents([]);
   }else{
    setRecords(await getAttendanceHistory(user.id));setTeacherEvents([]);setAdminEvents([]);
   }
  }catch(e:any){console.error('History loading error',e);Alert.alert('Could not load history',e?.message??'Please try again.');setRecords([]);setTeacherEvents([]);setAdminEvents([]);}
  finally{setLoading(false);}
 },[user]);
 useFocusEffect(useCallback(()=>{load();},[load]));
 const removeAttendance=(recordId:string)=>Alert.alert('Remove attendance record?','This action permanently removes the selected attendance record.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{const {error}=await supabase.from('attendance').delete().eq('id',recordId);if(error)Alert.alert('Could not remove record',error.message);else{Alert.alert('Removed','Attendance record was removed.');load();}}}]);
 if(loading)return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary}/><Text style={s.muted}>Loading attendance history...</Text></View>;
 if(!user)return <View style={s.center}><Text style={s.title}>Please log in to view attendance history.</Text></View>;

 if(role==='admin')return <FlatList style={s.screen} contentContainerStyle={s.content} data={adminEvents} keyExtractor={i=>i.id} ListHeaderComponent={<View><Text style={s.title}>Attendance History</Text><Text style={s.subtitle}>Overall attendance across all events.</Text><Pressable style={s.refresh} onPress={load}><Ionicons name="refresh-outline" size={18} color={COLORS.primaryDark}/><Text style={s.refreshText}>Refresh</Text></Pressable></View>} ListEmptyComponent={<View style={s.empty}><Ionicons name="time-outline" size={42} color={COLORS.textSecondary}/><Text style={s.cardTitle}>No events yet</Text></View>} renderItem={({item})=><View style={s.card}>
  <View style={s.eventHeader}><Text style={s.eventTitle}>{item.title}</Text><View style={s.countBadge}><Text style={s.countText}>{new Set(item.attendees.map(a=>a.student_id)).size}</Text></View></View>
  <Text style={s.meta}>Event Code: {item.event_code}</Text><Text style={s.meta}>Start: {fmt(item.start)}</Text><Text style={s.meta}>End: {fmt(item.end)}</Text>
  <Text style={s.attendeeTitle}>Students who scanned:</Text>
  {item.attendees.length===0?<Text style={s.muted}>No students have scanned this event yet.</Text>:item.attendees.map(a=><View key={a.id} style={s.attendeeRow}><View style={{flex:1}}><Text style={s.student}>{a.name}</Text><Text style={s.muted}>{fmt(a.scanned_at)}</Text></View><Pressable onPress={()=>removeAttendance(a.id)} style={s.deleteButton}><Ionicons name="trash-outline" size={17} color={COLORS.danger}/><Text style={s.deleteText}>Remove</Text></Pressable></View>)}
 </View>}/>;

 if(role==='teacher')return <View style={s.screen}><Text style={s.title}>Attendance History</Text><Text style={s.subtitle}>Attendance for events you created.</Text>{teacherEvents.length===0?<Text style={s.muted}>No events yet. Create an event from the Teacher tab.</Text>:<FlatList data={teacherEvents} keyExtractor={i=>i.eventId} contentContainerStyle={s.content} renderItem={({item})=><View style={s.card}><View style={s.eventHeader}><Text style={s.eventTitle}>{item.title}</Text><View style={s.countBadge}><Text style={s.countText}>{item.attendeeCount}</Text></View></View><Text style={s.meta}>Event Code: {item.eventCode}</Text>{item.startTime?<Text style={s.meta}>Start: {fmt(item.startTime)}</Text>:null}{item.endTime?<Text style={s.meta}>End: {fmt(item.endTime)}</Text>:null}<Text style={s.attendeeTitle}>Students who scanned:</Text>{item.attendees.length===0?<Text style={s.muted}>No students have scanned this event yet.</Text>:item.attendees.map(a=><View key={`${a.studentId}-${a.scannedAt}`} style={s.attendeeRow}><Text style={s.student}>{a.studentName || shortId(a.studentId)}</Text><Text style={s.muted}>{fmt(a.scannedAt)}</Text></View>)}</View>}/>}</View>;

 return <View style={s.screen}><Text style={s.title}>Attendance History</Text><Text style={s.subtitle}>Your saved attendance records.</Text>{records.length===0?<View style={s.empty}><Ionicons name="time-outline" size={42} color={COLORS.textSecondary}/><Text style={s.cardTitle}>No attendance yet</Text><Text style={s.muted}>Scan an event QR code to record attendance.</Text></View>:<FlatList data={records} keyExtractor={i=>i.id} contentContainerStyle={s.content} renderItem={({item})=><View style={s.card}><Text style={s.eventTitle}>{item.eventTitle}</Text><Text style={s.meta}>Event ID: {item.eventId}</Text><Text style={s.meta}>{fmt(item.scannedAt)}</Text></View>}/>}</View>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:COLORS.background},content:{padding:16,paddingBottom:30},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.background,padding:20},title:{fontSize:26,fontWeight:'800',color:COLORS.textPrimary},subtitle:{fontSize:14,color:COLORS.textSecondary,lineHeight:21,marginTop:5,marginBottom:14},muted:{fontSize:13,color:COLORS.textSecondary,lineHeight:19,marginTop:4},card:{backgroundColor:COLORS.card,borderRadius:18,borderWidth:1,borderColor:COLORS.border,padding:16,marginBottom:13},eventHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10},eventTitle:{flex:1,fontSize:17,fontWeight:'800',color:COLORS.textPrimary},countBadge:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.success,alignItems:'center',justifyContent:'center'},countText:{fontSize:16,fontWeight:'800',color:'#FFFFFF'},meta:{fontSize:13,color:COLORS.textSecondary,marginTop:7},attendeeTitle:{fontSize:14,fontWeight:'800',color:COLORS.textPrimary,marginTop:16,marginBottom:7},attendeeRow:{flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,marginTop:7},student:{fontSize:13,fontWeight:'700',color:COLORS.textPrimary},deleteButton:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FDEBED',paddingHorizontal:9,paddingVertical:7,borderRadius:9},deleteText:{fontSize:11,fontWeight:'800',color:COLORS.danger},refresh:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,padding:9,borderRadius:10,backgroundColor:COLORS.surface,marginBottom:8},refreshText:{fontSize:12,fontWeight:'700',color:COLORS.primaryDark},empty:{alignItems:'center',padding:25,backgroundColor:COLORS.card,borderRadius:16,borderWidth:1,borderColor:COLORS.border,marginTop:10},cardTitle:{fontSize:16,fontWeight:'800',color:COLORS.textPrimary,marginTop:8}});
