headxml = """<!DOCTYPE Scene>
<scene>
"""

meshxml = """
 <entity id="268">
  <component type="EC_Mesh" sync="1">
   <attribute value="0,0,0,90,0,180,1,1,1" name="Transform"/>
   <attribute value="local://%s.mesh" name="Mesh ref"/>
   <attribute value="local://%s.skeleton" name="Skeleton ref"/>
   <attribute value="local://%s.material" name="Mesh materials"/>
   <attribute value="0" name="Draw distance"/>
   <attribute value="false" name="Cast shadows"/>
  </component>
  """
  
placeablexml = """
  <component type="EC_Placeable" sync="1">
   <attribute value="0 0 0" name="Position"/>
   <attribute value="1 1 1" name="Scale"/>
   <attribute value="%f,%f,%f,0,0,0,1,1,1" name="Transform"/>
   <attribute value="false" name="Show bounding box"/>
   <attribute value="true" name="Visible"/>
  </component>
  """
  
namexml =  """
  <component type="EC_Name" sync="1">
   <attribute value="%s" name="name"/>
   <attribute value="" name="description"/>
   <attribute value="false" name="user-defined"/>
  </component>
 </entity>
 """

tailxml = """
</scene>
"""

pos = [-66, 41.44, 10.5]
dx = 1.0
names = ["silverside", 
              "anchovy", 
              "blue_crab", 
              "MallardF", 
              "Mallard.male", 
              "opossum", 
              "Osprey", 
              "stripedbass2",
              "terrapin",
              "wt_deer",
              "wt_deer_B"]

doc = ""
doc += headxml

for name in names:
    doc += meshxml % (name, name, name) 
    doc += placeablexml % (pos[0], pos[1], pos[2]) 
    doc += namexml % name
    pos[0] = pos[0] + dx

doc += tailxml

print doc

"""cam posses:

terrapin:
-57.50, 41.55, 10.60
83,10 0,00 102,90

mallard
-62,32 41,44 10,54
86,70 0,00 92,10

silverside
-65,88 41,49 10,50
89,10 0,00 113,40
"""