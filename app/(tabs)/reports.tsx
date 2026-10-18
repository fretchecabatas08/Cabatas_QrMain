import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

export default function AdminReportsScreen() {
 const {role}=useAuth();
 const [loading,setLoading]=useState(true);
 const [data,setData]=useState({users:0,students:0,teachers:0,admins:0,events:0,attendance:0});
 const [eventRows,setEventRows]=useState<{id:string;title:string;event_code:string;count:number}[]>([]);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(role!=='admin'){setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [u,st,te,ad,ev,at,events,attendance]=await Promise.all([
    supabase.from('profiles').select('*',{count:'exact',head:true}),
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','student'),
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','teacher'),
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','admin'),
    supabase.from('events').select('*',{count:'exact',head:true}),
    supabase.from('attendance').select('*',{count:'exact',head:true}),
    supabase.from('events').select('id,title,event_code').order('created_at',{ascending:false}),
    supabase.from('attendance').select('event_id'),
   ]);
   const bad=[u,st,te,ad,ev,at,events,attendance].find(x=>x.error);if(bad?.error)throw bad.error;
   setData({users:u.count??0,students:st.count??0,teachers:te.count??0,admins:ad.count??0,events:ev.count??0,attendance:at.count??0});
   const counts=new Map<string,number>();(attendance.data??[]).forEach((r:any)=>counts.set(r.event_id,(counts.get(r.event_id)??0)+1));
   setEventRows((events.data??[]).map((e:any)=>({ ...e,count:counts.get(e.id)??0 })));
  }catch(e:any){setError(e?.message??'Could not load report data.');}
  finally{setLoading(false);}
 },[role]);
 useFocusEffect(useCallback(()=>{load();},[load]));
 if(role!=='admin')return <View style={s.center}><Ionicons name="lock-closed-outline" size={42} color={COLORS.primary}/><Text style={s.title}>Administrators Only</Text></View>;
 const metrics=[['Total Users',data.users,'people-outline'],['Students',data.students,'school-outline'],['Teachers',data.teachers,'person-outline'],['Administrators',data.admins,'shield-checkmark-outline'],['Events',data.events,'calendar-outline'],['Attendance Records',data.attendance,'checkmark-done-outline']] as const;
 return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.title}>System Reports</Text><Text style={s.subtitle}>Live summaries from your QR attendance database.</Text><Pressable style={s.refresh} onPress={load}><Ionicons name="refresh-outline" size={19} color={COLORS.primaryDark}/><Text style={s.refreshText}>Refresh report</Text></Pressable>
 {loading?<ActivityIndicator size="large" color={COLORS.primary} style={{margin:28}}/>:error?<View style={s.card}><Text style={s.error}>{error}</Text><Text style={s.muted}>Check your Supabase RLS policies and Admin migration.</Text></View>:<>
 <View style={s.grid}>{metrics.map(([label,value,icon])=><View key={label} style={s.metric}><View style={s.icon}><Ionicons name={icon} size={22} color={COLORS.primaryDark}/></View><Text style={s.value}>{value}</Text><Text style={s.label}>{label}</Text></View>)}</View>
 <Text style={s.section}>Attendance by Event</Text>
 {eventRows.length===0?<View style={s.card}><Text style={s.muted}>No events are available to report yet.</Text></View>:eventRows.map(e=><View key={e.id} style={s.eventCard}><View style={{flex:1}}><Text style={s.eventTitle}>{e.title}</Text><Text style={s.muted}>{e.event_code}</Text></View><View style={s.count}><Text style={s.countValue}>{e.count}</Text><Text style={s.countLabel}>attended</Text></View></View>)}
 </>}
 </ScrollView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:COLORS.background},content:{padding:18,paddingBottom:35},center:{flex:1,backgroundColor:COLORS.background,alignItems:'center',justifyContent:'center'},title:{fontSize:26,fontWeight:'800',color:COLORS.textPrimary},subtitle:{fontSize:14,lineHeight:21,color:COLORS.textSecondary,marginTop:5,marginBottom:16},refresh:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:7,padding:10,borderRadius:11,backgroundColor:COLORS.surface,marginBottom:14},refreshText:{fontSize:13,fontWeight:'700',color:COLORS.primaryDark},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{width:'48%',flexGrow:1,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:17,padding:15},icon:{width:40,height:40,borderRadius:13,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},value:{fontSize:27,fontWeight:'800',color:COLORS.textPrimary,marginTop:12},label:{fontSize:12,color:COLORS.textSecondary,marginTop:3},section:{fontSize:20,fontWeight:'800',color:COLORS.textPrimary,marginTop:25,marginBottom:12},eventCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.card,borderRadius:16,borderWidth:1,borderColor:COLORS.border,padding:15,marginBottom:10},eventTitle:{fontSize:15,fontWeight:'800',color:COLORS.textPrimary},muted:{fontSize:13,color:COLORS.textSecondary,marginTop:4},count:{alignItems:'center',backgroundColor:COLORS.surface,borderRadius:13,paddingHorizontal:14,paddingVertical:9},countValue:{fontSize:20,fontWeight:'800',color:COLORS.primaryDark},countLabel:{fontSize:10,color:COLORS.textSecondary},card:{padding:16,backgroundColor:COLORS.card,borderRadius:15},error:{color:COLORS.danger,fontWeight:'700'}});
